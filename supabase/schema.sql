-- Zelfora: database schema snapshot (public tables only)
-- Source: Supabase Dashboard -> "Copy database schema as SQL", 2026-09-25.
-- Reference only; do not run. Update this file whenever the schema changes.
--
-- Not included in this export:
--   - RLS policies and the order-validation trigger: see auth_hardening.sql
--   - profiles RLS, set up in the dashboard: RLS enabled, with policies
--     "Users can view their own profile" (SELECT) and
--     "Users can update their own profile" (UPDATE)
--   - Whatever creates a profiles row on signup (orders.user_id references
--     profiles.id, so one must exist); it lives only in the dashboard
--   - The element type of restaurants.tags (the export shows just ARRAY)

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cuisine text,
  rating numeric,
  delivery_time text,
  delivery_fee numeric NOT NULL DEFAULT 0,
  image text,
  description text,
  tags ARRAY,
  address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT restaurants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL,
  description text,
  category text,
  image text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  items jsonb NOT NULL,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'placed'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
