-- Zelfora: restaurant owners
-- Lets a signed-in user register one restaurant and run it from the portal:
-- its details, photo, opening hours and menu.
-- New restaurants stay hidden from customers until an admin approves them by
-- setting published = true in the Table Editor. Renaming a published
-- restaurant needs approval too (section 5).
--
-- Run in Supabase Dashboard -> SQL Editor BEFORE orders.sql (validate_order
-- there uses is_open() and menu_items.available from here). Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Ownership and approval
-- ---------------------------------------------------------------------------

-- An owner is a normal user whose id is on a restaurant. There is deliberately
-- no role column on profiles: users can update their own profile row, so they
-- could make themselves an owner. To hand an existing restaurant to someone,
-- set its owner_id in the Table Editor.
alter table public.restaurants
  add column if not exists owner_id uuid references public.profiles(id);

-- Added with default true so the existing restaurants stay visible, then the
-- default flips to false for new ones. On a re-run the add is skipped, so
-- nothing that was unpublished in the meantime gets published again.
alter table public.restaurants
  add column if not exists published boolean not null default true;
alter table public.restaurants
  alter column published set default false;

-- One restaurant per owner for now. The portal assumes this.
create unique index if not exists restaurants_one_per_owner
  on public.restaurants (owner_id)
  where owner_id is not null;

-- A new name the owner asked for, waiting for approval (section 5).
alter table public.restaurants
  add column if not exists requested_name text;

-- ---------------------------------------------------------------------------
-- 2. Opening hours, pausing and the menu
-- ---------------------------------------------------------------------------

-- The owner's switch to stop taking orders, for example on a busy evening.
alter table public.restaurants
  add column if not exists accepting_orders boolean not null default true;

-- Weekly opening hours in Dutch time, keyed by ISO weekday (1 = Monday):
--   {"1": ["11:00", "22:00"], "5": ["17:00", "01:00"]}
-- A missing day is closed. A closing time at or before the opening time means
-- the restaurant closes after midnight. Null means no hours are set: orders
-- are accepted whenever accepting_orders is on.
alter table public.restaurants
  add column if not exists opening_hours jsonb;

create or replace function public.valid_opening_hours(hours jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when hours is null then true
    when jsonb_typeof(hours) <> 'object' then false
    else not exists (
      select 1
      from jsonb_each(hours) as entry(weekday, period)
      where entry.weekday not in ('1', '2', '3', '4', '5', '6', '7')
        -- Nested WHENs, because AND doesn't guarantee jsonb_array_length
        -- only runs on arrays.
        or case
          when jsonb_typeof(entry.period) <> 'array' then true
          when jsonb_array_length(entry.period) <> 2 then true
          else not coalesce(
            entry.period->>0 ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
            and entry.period->>1 ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
            and entry.period->>0 <> entry.period->>1,
            false
          )
        end
    )
  end
$$;

create or replace function public.is_within_opening_hours(hours jsonb, at_time timestamptz default now())
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  local_time timestamp := at_time at time zone 'Europe/Amsterdam';
  today      int := extract(isodow from local_time);
  yesterday  int := (today + 5) % 7 + 1;
  now_time   time := local_time::time;
  opens      time;
  closes     time;
begin
  if hours is null then
    return true;
  end if;

  -- Today's hours, which may run past midnight.
  if hours ? today::text then
    opens  := (hours -> today::text ->> 0)::time;
    closes := (hours -> today::text ->> 1)::time;
    if now_time >= opens and (closes <= opens or now_time < closes) then
      return true;
    end if;
  end if;

  -- Yesterday's hours, if they run past midnight into today.
  if hours ? yesterday::text then
    opens  := (hours -> yesterday::text ->> 0)::time;
    closes := (hours -> yesterday::text ->> 1)::time;
    if closes <= opens and now_time < closes then
      return true;
    end if;
  end if;

  return false;
end;
$$;

-- Whether customers can order right now (publishing is checked separately).
-- PostgREST exposes this as a computed column: select('*, is_open').
create or replace function public.is_open(restaurant public.restaurants)
returns boolean
language sql
stable
set search_path = ''
as $$
  select restaurant.accepting_orders and public.is_within_opening_hours(restaurant.opening_hours)
$$;

-- Owners mark dishes as sold out, choose the order of their menu (section 7)
-- and the options customers can pick. Items without a position come last.
alter table public.menu_items
  add column if not exists available boolean not null default true;
alter table public.menu_items
  add column if not exists position integer;

-- Choices the customer makes when adding a dish, such as a size, a sauce or
-- extra cheese, as a list of groups:
--   [{"id": "…", "name": "Extra's", "min": 0, "max": 3,
--     "choices": [{"id": "…", "name": "Extra kaas", "price": 0.75}, …]}]
-- The customer picks at least min and at most max choices from each group
-- (max null: no limit). A choice's price is added to the dish's price.
-- The ids are random UUIDs made by the portal; validate_order in orders.sql
-- looks the chosen choices up by id.
alter table public.menu_items
  add column if not exists options jsonb not null default '[]'::jsonb;

create or replace function public.valid_menu_options(options jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  grp     jsonb;
  choice  jsonb;
  min_n   numeric;
  max_n   numeric;
  ids     text[] := '{}';
begin
  if jsonb_typeof(options) is distinct from 'array' or jsonb_array_length(options) > 20 then
    return false;
  end if;

  for grp in select value from jsonb_array_elements(options) loop
    -- Types first: -> on a non-object returns null, but jsonb_array_length
    -- fails on anything but an array.
    if jsonb_typeof(grp) <> 'object'
       or jsonb_typeof(grp->'id') is distinct from 'string'
       or jsonb_typeof(grp->'name') is distinct from 'string'
       or jsonb_typeof(grp->'min') is distinct from 'number'
       or coalesce(jsonb_typeof(grp->'max'), 'null') not in ('number', 'null')
       or jsonb_typeof(grp->'choices') is distinct from 'array' then
      return false;
    end if;

    min_n := (grp->>'min')::numeric;
    max_n := (grp->>'max')::numeric;
    if char_length(grp->>'id') not between 1 and 64
       or char_length(btrim(grp->>'name')) not between 1 and 60
       or jsonb_array_length(grp->'choices') not between 1 and 30
       -- A group must be possible to fill in.
       or min_n <> trunc(min_n) or min_n < 0 or min_n > jsonb_array_length(grp->'choices')
       or (max_n is not null and (max_n <> trunc(max_n) or max_n < 1 or max_n < min_n)) then
      return false;
    end if;
    ids := ids || (grp->>'id');

    for choice in select value from jsonb_array_elements(grp->'choices') loop
      if jsonb_typeof(choice) <> 'object'
         or jsonb_typeof(choice->'id') is distinct from 'string'
         or jsonb_typeof(choice->'name') is distinct from 'string'
         or jsonb_typeof(choice->'price') is distinct from 'number' then
        return false;
      end if;
      if char_length(choice->>'id') not between 1 and 64
         or char_length(btrim(choice->>'name')) not between 1 and 60
         or (choice->>'price')::numeric < 0
         or (choice->>'price')::numeric >= 100
         or (choice->>'price')::numeric <> round((choice->>'price')::numeric, 2) then
        return false;
      end if;
      ids := ids || (choice->>'id');
    end loop;
  end loop;

  -- Unique within the dish, so a chosen id points to exactly one choice.
  return (select count(distinct id) = count(*) from unnest(ids) as id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Limits on what owners can enter
--    The constraints on the original columns are NOT VALID: enforced for new
--    and changed rows without re-checking the existing data. The portal
--    mirrors these limits in its forms.
-- ---------------------------------------------------------------------------

alter table public.restaurants drop constraint if exists restaurants_text_lengths;
alter table public.restaurants add constraint restaurants_text_lengths check (
  char_length(btrim(name)) between 1 and 100
  and char_length(cuisine) <= 50
  and char_length(address) <= 200
  and char_length(description) <= 1000
  and char_length(delivery_time) <= 30
  and char_length(image) <= 2000
) not valid;

alter table public.restaurants drop constraint if exists restaurants_delivery_fee_range;
alter table public.restaurants add constraint restaurants_delivery_fee_range check (
  delivery_fee >= 0 and delivery_fee < 100 and delivery_fee = round(delivery_fee, 2)
) not valid;

-- Image columns hold a URL: a pasted link or an upload in the images bucket
-- (see images.sql). Only allow https so pages never load mixed content.
alter table public.restaurants drop constraint if exists restaurants_image_https;
alter table public.restaurants add constraint restaurants_image_https check (
  image ~* '^https://'
) not valid;

alter table public.restaurants drop constraint if exists restaurants_requested_name_length;
alter table public.restaurants add constraint restaurants_requested_name_length check (
  char_length(btrim(requested_name)) between 1 and 100
);

alter table public.restaurants drop constraint if exists restaurants_opening_hours_valid;
alter table public.restaurants add constraint restaurants_opening_hours_valid check (
  public.valid_opening_hours(opening_hours)
);

alter table public.menu_items drop constraint if exists menu_items_text_lengths;
alter table public.menu_items add constraint menu_items_text_lengths check (
  char_length(btrim(name)) between 1 and 100
  and char_length(category) <= 50
  and char_length(description) <= 500
  and char_length(image) <= 2000
) not valid;

alter table public.menu_items drop constraint if exists menu_items_price_range;
alter table public.menu_items add constraint menu_items_price_range check (
  price > 0 and price < 1000 and price = round(price, 2)
) not valid;

alter table public.menu_items drop constraint if exists menu_items_image_https;
alter table public.menu_items add constraint menu_items_image_https check (
  image ~* '^https://'
) not valid;

alter table public.menu_items drop constraint if exists menu_items_options_valid;
alter table public.menu_items add constraint menu_items_options_valid check (
  public.valid_menu_options(options)
);

-- ---------------------------------------------------------------------------
-- 4. New restaurants from the portal
--    Don't trust the browser: the owner is always the signed-in user, and a
--    new restaurant starts unpublished and unrated.
-- ---------------------------------------------------------------------------

create or replace function public.prepare_new_restaurant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Inserts from the dashboard or SQL Editor (no signed-in user) are left alone.
  if auth.uid() is not null then
    new.owner_id       := auth.uid();
    new.published      := false;
    new.rating         := null;
    new.requested_name := null;
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_new_restaurant on public.restaurants;
create trigger prepare_new_restaurant
  before insert on public.restaurants
  for each row execute function public.prepare_new_restaurant();

-- ---------------------------------------------------------------------------
-- 5. Name changes
--    Owners can't update name (see the grant in section 6); they set
--    requested_name instead. While the restaurant is unpublished the new name
--    applies right away, because the admin reviews the whole restaurant before
--    publishing it. For a published restaurant the request waits: the admin
--    approves it by copying requested_name into name in the Table Editor
--    (which clears the request), or rejects it by clearing requested_name.
-- ---------------------------------------------------------------------------

create or replace function public.handle_name_request()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.requested_name := nullif(btrim(new.requested_name), '');
  if new.requested_name is not null and not old.published then
    new.name := new.requested_name;
  end if;
  -- Approving the request, or asking for the current name, closes it.
  if new.requested_name = new.name then
    new.requested_name := null;
  end if;
  return new;
end;
$$;

drop trigger if exists handle_name_request on public.restaurants;
create trigger handle_name_request
  before update on public.restaurants
  for each row execute function public.handle_name_request();

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
--    These replace the old using (true) read policies, which existed as
--    "... are public" (from auth_hardening.sql) and "... are publicly
--    readable" (from the dashboard). Both names are dropped here.
-- ---------------------------------------------------------------------------

grant insert on public.restaurants, public.menu_items to authenticated;

-- Everyone sees published restaurants; owners also see their own.
drop policy if exists "Restaurants are public" on public.restaurants;
drop policy if exists "Restaurants are publicly readable" on public.restaurants;
drop policy if exists "Published restaurants are public" on public.restaurants;
create policy "Published restaurants are public"
  on public.restaurants for select
  to anon, authenticated
  using (published or owner_id = (select auth.uid()));

drop policy if exists "Menu items are public" on public.menu_items;
drop policy if exists "Menu items are publicly readable" on public.menu_items;
drop policy if exists "Menu items of published restaurants are public" on public.menu_items;
create policy "Menu items of published restaurants are public"
  on public.menu_items for select
  to anon, authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = menu_items.restaurant_id
      and (r.published or r.owner_id = (select auth.uid()))
  ));

-- WITH CHECK runs after the BEFORE INSERT trigger has set owner_id.
drop policy if exists "Owners register their restaurant" on public.restaurants;
create policy "Owners register their restaurant"
  on public.restaurants for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners add menu items" on public.menu_items;
create policy "Owners add menu items"
  on public.menu_items for insert
  to authenticated
  with check (exists (
    select 1 from public.restaurants r
    where r.id = menu_items.restaurant_id
      and r.owner_id = (select auth.uid())
  ));

-- Owners manage their own menu from the portal: edit, reorder, mark as sold
-- out and delete items.
grant update, delete on public.menu_items to authenticated;

drop policy if exists "Owners update menu items" on public.menu_items;
create policy "Owners update menu items"
  on public.menu_items for update
  to authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = menu_items.restaurant_id
      and r.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.restaurants r
    where r.id = menu_items.restaurant_id
      and r.owner_id = (select auth.uid())
  ));

drop policy if exists "Owners delete menu items" on public.menu_items;
create policy "Owners delete menu items"
  on public.menu_items for delete
  to authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = menu_items.restaurant_id
      and r.owner_id = (select auth.uid())
  ));

-- Owners can change their restaurant, but only the columns granted here, so
-- they can't publish it, rate it, rename it without approval or hand it to
-- someone else. To let owners edit more fields, add those columns to the
-- grant. (Revoking the table-wide privilege first also clears earlier column
-- grants, so this is re-runnable.)
revoke update on public.restaurants from authenticated;
grant update (
  image, requested_name, cuisine, address, description, delivery_time, delivery_fee,
  accepting_orders, opening_hours
) on public.restaurants to authenticated;

drop policy if exists "Owners update their restaurant" on public.restaurants;
create policy "Owners update their restaurant"
  on public.restaurants for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- No delete policy on restaurants, so owners can't delete them.

-- ---------------------------------------------------------------------------
-- 7. Menu order
--    Saves the whole order in one call: each item's position becomes its
--    index in item_ids. It runs with the caller's rights, so RLS only lets it
--    change the caller's own items. Returns how many items were updated.
-- ---------------------------------------------------------------------------

create or replace function public.reorder_menu_items(item_ids uuid[])
returns integer
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.menu_items as m
    set position = o.ord
    from unnest(item_ids) with ordinality as o(id, ord)
    where m.id = o.id
    returning 1
  )
  select count(*)::integer from updated
$$;

revoke execute on function public.reorder_menu_items(uuid[]) from public, anon;
grant execute on function public.reorder_menu_items(uuid[]) to authenticated;
