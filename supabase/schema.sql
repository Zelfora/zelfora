-- Zelfora: database schema snapshot (public tables only)
-- Source: Supabase Dashboard -> "Copy database schema as SQL", 2026-09-25.
-- Reference only; do not run. Update this file whenever the schema changes.
-- restaurants.owner_id/published, profiles.avatar_url and the CHECK
-- constraints were added by hand from restaurant_owners.sql and images.sql;
-- re-export after running them to confirm.
--
-- Not included in this export:
--   - RLS policies and the order-validation trigger: see auth_hardening.sql
--   - Owner policies, the prepare_new_restaurant trigger, the column grant on
--     restaurants and the unique index restaurants_one_per_owner: see
--     restaurant_owners.sql
--   - The "images" Storage bucket and its policies: see images.sql
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
  avatar_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_avatar_url_valid CHECK (avatar_url ~* '^https://'::text AND char_length(avatar_url) <= 2000)
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
  owner_id uuid,
  published boolean NOT NULL DEFAULT false,
  CONSTRAINT restaurants_pkey PRIMARY KEY (id),
  CONSTRAINT restaurants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT restaurants_text_lengths CHECK (char_length(btrim(name)) >= 1 AND char_length(btrim(name)) <= 100 AND char_length(cuisine) <= 50 AND char_length(address) <= 200 AND char_length(description) <= 1000 AND char_length(delivery_time) <= 30 AND char_length(image) <= 2000),
  CONSTRAINT restaurants_delivery_fee_range CHECK (delivery_fee >= 0::numeric AND delivery_fee < 100::numeric AND delivery_fee = round(delivery_fee, 2)),
  CONSTRAINT restaurants_image_https CHECK (image ~* '^https://'::text)
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
  CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT menu_items_text_lengths CHECK (char_length(btrim(name)) >= 1 AND char_length(btrim(name)) <= 100 AND char_length(category) <= 50 AND char_length(description) <= 500 AND char_length(image) <= 2000),
  CONSTRAINT menu_items_price_range CHECK (price > 0::numeric AND price < 1000::numeric AND price = round(price, 2)),
  CONSTRAINT menu_items_image_https CHECK (image ~* '^https://'::text)
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
