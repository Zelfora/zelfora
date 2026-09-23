-- Zelfora: auth hardening
-- Run once in Supabase Dashboard -> SQL Editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Row Level Security
--    The anon key ships to every browser, so RLS is what actually protects data.
-- ---------------------------------------------------------------------------

alter table public.restaurants enable row level security;
alter table public.menu_items  enable row level security;
alter table public.orders      enable row level security;

-- Restaurants and menus are public, read-only.
drop policy if exists "Restaurants are public" on public.restaurants;
create policy "Restaurants are public"
  on public.restaurants for select
  to anon, authenticated
  using (true);

drop policy if exists "Menu items are public" on public.menu_items;
create policy "Menu items are public"
  on public.menu_items for select
  to anon, authenticated
  using (true);

-- Orders: signed-in users can only see and create their own.
-- No update/delete policies, so those are denied.
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

-- ---------------------------------------------------------------------------
-- 2. Server-side order validation
--    Don't trust the price/total sent by the browser: recompute it from
--    menu_items and reject items that don't belong to the restaurant.
-- ---------------------------------------------------------------------------

create or replace function public.validate_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item          jsonb;
  menu_row      record;
  qty           int;
  clean_items   jsonb := '[]'::jsonb;
  computed      numeric := 0;
begin
  new.user_id := auth.uid();

  if new.items is null or jsonb_array_length(new.items::jsonb) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  for item in select * from jsonb_array_elements(new.items::jsonb) loop
    qty := (item->>'quantity')::int;
    if qty is null or qty < 1 or qty > 99 then
      raise exception 'Invalid quantity';
    end if;

    select id, name, price into menu_row
    from menu_items
    where id::text = item->>'menu_item_id'
      and restaurant_id = new.restaurant_id;

    if not found then
      raise exception 'Unknown menu item for this restaurant';
    end if;

    clean_items := clean_items || jsonb_build_object(
      'menu_item_id', menu_row.id,
      'name',         menu_row.name,
      'price',        menu_row.price,
      'quantity',     qty
    );
    computed := computed + menu_row.price * qty;
  end loop;

  new.items := clean_items;
  new.total := computed;
  return new;
end;
$$;

drop trigger if exists validate_order on public.orders;
create trigger validate_order
  before insert on public.orders
  for each row execute function public.validate_order();
