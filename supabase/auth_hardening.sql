-- Zelfora: auth hardening
-- Run once in Supabase Dashboard -> SQL Editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Row Level Security
--    The anon key ships to every browser, so RLS is what actually protects data.
-- ---------------------------------------------------------------------------

alter table public.restaurants enable row level security;
alter table public.menu_items  enable row level security;
alter table public.orders      enable row level security;

-- Who can read and add restaurants and menu items is defined in
-- restaurant_owners.sql. Don't bring back the old "... are public" policies
-- with using (true) here: policies are OR'ed together, so that would expose
-- unpublished restaurants.

-- The orders policies and the order-validation trigger used to live here and
-- are now in orders.sql.
