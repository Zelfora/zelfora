-- Zelfora: auth hardening
-- Run in Supabase Dashboard -> SQL Editor after orders.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Row Level Security
--    The anon key ships to every browser, so RLS is what actually protects data.
--    (profiles.sql enables it for profiles.)
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

-- ---------------------------------------------------------------------------
-- 2. Privileges
--    Supabase gives anon and authenticated every privilege on new tables and
--    leaves the rest to RLS. Visitors who aren't signed in only ever read, so
--    take away their write privileges too: then a policy that is written for
--    "public" by mistake still can't let them change anything. Nobody needs
--    TRUNCATE (which RLS doesn't cover), REFERENCES or TRIGGER. What signed-in
--    users may write is granted in the file of each table.
-- ---------------------------------------------------------------------------

revoke insert, update, delete, truncate, references, trigger
  on public.restaurants, public.menu_items, public.orders, public.profiles
  from anon;
revoke truncate, references, trigger
  on public.restaurants, public.menu_items, public.orders, public.profiles
  from authenticated;
