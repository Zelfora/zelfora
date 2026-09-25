-- Zelfora: restaurant owners
-- Lets a signed-in user register one restaurant and add menu items to it.
-- New restaurants stay hidden from customers until an admin approves them by
-- setting published = true in the Table Editor.
--
-- Run in Supabase Dashboard -> SQL Editor BEFORE auth_hardening.sql
-- (validate_order there reads restaurants.published). Safe to re-run.

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

-- ---------------------------------------------------------------------------
-- 2. Limits on what owners can enter
--    NOT VALID: enforced for new and changed rows without re-checking the
--    existing data. The portal mirrors these limits in its forms.
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

-- Images are plain links (no uploads yet); only allow https so pages never
-- load mixed content.
alter table public.restaurants drop constraint if exists restaurants_image_https;
alter table public.restaurants add constraint restaurants_image_https check (
  image ~* '^https://'
) not valid;

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

-- ---------------------------------------------------------------------------
-- 3. New restaurants from the portal
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
    new.owner_id  := auth.uid();
    new.published := false;
    new.rating    := null;
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_new_restaurant on public.restaurants;
create trigger prepare_new_restaurant
  before insert on public.restaurants
  for each row execute function public.prepare_new_restaurant();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
--    These replace the "Restaurants are public" and "Menu items are public"
--    policies that used to live in auth_hardening.sql.
-- ---------------------------------------------------------------------------

grant insert on public.restaurants, public.menu_items to authenticated;

-- Everyone sees published restaurants; owners also see their own.
drop policy if exists "Restaurants are public" on public.restaurants;
drop policy if exists "Published restaurants are public" on public.restaurants;
create policy "Published restaurants are public"
  on public.restaurants for select
  to anon, authenticated
  using (published or owner_id = (select auth.uid()));

drop policy if exists "Menu items are public" on public.menu_items;
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

-- No update/delete policies on restaurants or menu_items, so those are denied.
-- Editing restaurant details later needs column-level protection so owners
-- can't set published themselves.
