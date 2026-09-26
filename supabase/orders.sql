-- Zelfora: orders
-- Customers place orders from the cart. Restaurant owners see the orders for
-- their restaurant in the portal and move them through the statuses.
--
-- Run in Supabase Dashboard -> SQL Editor AFTER restaurant_owners.sql
-- (validate_order uses is_open(), menu_items.available and menu_items.options
-- from there).
-- RLS on orders is enabled in auth_hardening.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Columns and limits
-- ---------------------------------------------------------------------------

-- What the restaurant needs to deliver. Orders from before these columns
-- existed have none; validate_order requires them on new orders.
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists phone text;
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists note text;
-- The restaurant's delivery fee when the order was placed. total includes it.
alter table public.orders add column if not exists delivery_fee numeric not null default 0;
-- When the order reached 'delivered', set by check_order_status_change
-- (section 4). Orders delivered before this column existed have none.
alter table public.orders add column if not exists delivered_at timestamptz;

alter table public.orders drop constraint if exists orders_delivered_at_valid;
alter table public.orders add constraint orders_delivered_at_valid check (
  delivered_at is null or (status = 'delivered' and delivered_at >= created_at)
);

alter table public.orders drop constraint if exists orders_text_lengths;
alter table public.orders add constraint orders_text_lengths check (
  char_length(customer_name) <= 100
  and char_length(phone) <= 30
  and char_length(delivery_address) <= 200
  and char_length(note) <= 500
);

-- placed -> preparing -> delivering -> delivered, or cancelled before it's
-- delivered. Section 4 allows one step at a time.
alter table public.orders drop constraint if exists orders_status_valid;
alter table public.orders add constraint orders_status_valid check (
  status in ('placed', 'preparing', 'delivering', 'delivered', 'cancelled')
);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security
--    Customers see and create their own orders. Owners see the orders for
--    their restaurant and can change only their status. There are no delete
--    policies, so orders can't be deleted.
-- ---------------------------------------------------------------------------

-- The first two drops remove older duplicates made in the dashboard.
drop policy if exists "Users can view their own orders" on public.orders;
drop policy if exists "Users can create their own orders" on public.orders;
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders"
  on public.orders for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create own orders" on public.orders;
create policy "Users create own orders"
  on public.orders for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Owners read their restaurant's orders" on public.orders;
create policy "Owners read their restaurant's orders"
  on public.orders for select
  to authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = orders.restaurant_id
      and r.owner_id = (select auth.uid())
  ));

-- Only the status column can be updated, by anyone; the policy limits it to
-- the restaurant's owner. (Revoking the table-wide privilege first also
-- clears earlier column grants, so this is re-runnable.)
revoke update on public.orders from anon, authenticated;
grant update (status) on public.orders to authenticated;

drop policy if exists "Owners update their restaurant's orders" on public.orders;
create policy "Owners update their restaurant's orders"
  on public.orders for update
  to authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = orders.restaurant_id
      and r.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.restaurants r
    where r.id = orders.restaurant_id
      and r.owner_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- 3. Server-side order validation
--    Don't trust the browser: recompute prices and the total from the
--    database, and reject orders the restaurant can't take. Errors carry a
--    hint (such as 'restaurant_closed') that the cart translates.
-- ---------------------------------------------------------------------------

create or replace function public.validate_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  restaurant    restaurants%rowtype;
  item          jsonb;
  menu_row      record;
  qty           int;
  chosen        jsonb;
  clean_options jsonb;
  options_price numeric;
  matched       int;
  unit_price    numeric;
  clean_items   jsonb := '[]'::jsonb;
  computed      numeric := 0;
begin
  new.user_id      := auth.uid();
  -- Every order starts at the first status, at the current time.
  new.status       := 'placed';
  new.created_at   := now();
  new.delivered_at := null;

  -- The restaurant needs a name, phone number and address; the note is optional.
  new.customer_name    := nullif(btrim(new.customer_name), '');
  new.phone            := nullif(btrim(new.phone), '');
  new.delivery_address := nullif(btrim(new.delivery_address), '');
  new.note             := nullif(btrim(new.note), '');
  if new.customer_name is null or new.phone is null or new.delivery_address is null then
    raise exception 'Name, phone number and delivery address are required'
      using hint = 'details_required';
  end if;

  if new.items is null or jsonb_array_length(new.items::jsonb) = 0 then
    raise exception 'Order must contain at least one item' using hint = 'empty';
  end if;

  -- security definer bypasses RLS, so check this here as well.
  select * into restaurant from restaurants where id = new.restaurant_id;
  if not found or not restaurant.published then
    raise exception 'Restaurant is not accepting orders' using hint = 'restaurant_unavailable';
  end if;
  if not is_open(restaurant) then
    raise exception 'Restaurant is closed' using hint = 'restaurant_closed';
  end if;

  for item in select * from jsonb_array_elements(new.items::jsonb) loop
    qty := (item->>'quantity')::int;
    if qty is null or qty < 1 or qty > 99 then
      raise exception 'Invalid quantity';
    end if;

    select id, name, price, available, options into menu_row
    from menu_items
    where id::text = item->>'menu_item_id'
      and restaurant_id = new.restaurant_id;

    if not found then
      raise exception 'Unknown menu item for this restaurant' using hint = 'unknown_item';
    end if;
    if not menu_row.available then
      raise exception '% is sold out', menu_row.name
        using hint = 'sold_out', detail = menu_row.name;
    end if;

    -- The chosen options ([{"id": …}, …]; see menu_items.options in
    -- restaurant_owners.sql). Only their ids are used: names and prices come
    -- from the menu.
    chosen := case when jsonb_typeof(item->'options') = 'array' then item->'options' else '[]'::jsonb end;

    select coalesce(jsonb_agg(jsonb_build_object(
             'id',    c.choice->>'id',
             'group', g.grp->>'name',
             'name',  c.choice->>'name',
             'price', (c.choice->>'price')::numeric
           ) order by g.ord, c.ord), '[]'::jsonb),
           coalesce(sum((c.choice->>'price')::numeric), 0),
           count(*)
      into clean_options, options_price, matched
    from jsonb_array_elements(menu_row.options) with ordinality as g(grp, ord)
    cross join lateral jsonb_array_elements(g.grp->'choices') with ordinality as c(choice, ord)
    where c.choice->>'id' in (select o.value->>'id' from jsonb_array_elements(chosen) as o(value));

    -- Every chosen id must be one of the dish's choices, once, and each group
    -- needs between min and max choices. If not, the owner changed the
    -- options after the dish went into the cart.
    if matched <> jsonb_array_length(chosen) or exists (
      select 1
      from jsonb_array_elements(menu_row.options) as g(grp)
      cross join lateral (
        select count(*) as n
        from jsonb_array_elements(g.grp->'choices') as c(choice)
        where c.choice->>'id' in (select o.value->>'id' from jsonb_array_elements(chosen) as o(value))
      ) as picked
      where picked.n < (g.grp->>'min')::int
         or picked.n > coalesce((g.grp->>'max')::int, picked.n)
    ) then
      raise exception 'The options of % have changed', menu_row.name
        using hint = 'options_changed', detail = menu_row.name;
    end if;

    -- price is the price of one, options included.
    unit_price := menu_row.price + options_price;
    clean_items := clean_items || jsonb_build_object(
      'menu_item_id', menu_row.id,
      'name',         menu_row.name,
      'price',        unit_price,
      'quantity',     qty,
      'options',      clean_options
    );
    computed := computed + unit_price * qty;
  end loop;

  new.items        := clean_items;
  new.delivery_fee := restaurant.delivery_fee;
  new.total        := computed + restaurant.delivery_fee;
  return new;
end;
$$;

drop trigger if exists validate_order on public.orders;
create trigger validate_order
  before insert on public.orders
  for each row execute function public.validate_order();

-- ---------------------------------------------------------------------------
-- 4. Status changes
--    One step forward at a time, or cancelled before delivery. Changes from
--    the dashboard or SQL Editor (no signed-in user) are left alone, so an
--    admin can correct a mistake.
--    Reaching 'delivered' records the time in delivered_at, also from the
--    dashboard; moving an order back out of 'delivered' clears it. Only a
--    status change touches it, so an admin can correct the time on its own.
-- ---------------------------------------------------------------------------

create or replace function public.check_order_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if auth.uid() is not null and not (
    (old.status = 'placed' and new.status in ('preparing', 'cancelled'))
    or (old.status = 'preparing' and new.status in ('delivering', 'cancelled'))
    or (old.status = 'delivering' and new.status in ('delivered', 'cancelled'))
  ) then
    raise exception 'An order can''t go from % to %', old.status, new.status
      using hint = 'invalid_status_change';
  end if;
  new.delivered_at := case when new.status = 'delivered' then now() end;
  return new;
end;
$$;

drop trigger if exists check_order_status_change on public.orders;
create trigger check_order_status_change
  before update on public.orders
  for each row execute function public.check_order_status_change();

-- ---------------------------------------------------------------------------
-- 5. Live updates
--    Realtime sends each new or changed order to the subscribers whose RLS
--    policies let them read it: the customer and the restaurant's owner.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
