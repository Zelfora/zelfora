-- Zelfora: database schema snapshot (public tables only)
-- Checked column by column against the live database on 2026-09-26.
-- Reference only; do not run. Update this file whenever the schema changes.
-- The CHECK constraints on the original columns are NOT VALID in the
-- database (see restaurant_owners.sql, section 3).
--
-- Not included in this snapshot:
--   - RLS policies, grants, triggers and functions:
--       profiles.sql: the profiles policies and column grant, and
--         handle_new_user() (SECURITY DEFINER) with the on_auth_user_created
--         trigger on auth.users, which adds the profiles row (id, email) on
--         signup
--       restaurant_owners.sql: restaurants and menu_items owner policies,
--         column grants, the prepare_new_restaurant and handle_name_request
--         triggers, the unique index restaurants_one_per_owner, and the
--         functions valid_opening_hours, is_within_opening_hours, is_open (a
--         computed column on restaurants), valid_menu_options and
--         reorder_menu_items
--       orders.sql: orders policies, the column grant, the validate_order
--         and check_order_status_change triggers, the Realtime publication
--       auth_hardening.sql: RLS on restaurants, menu_items and orders, and
--         the privileges taken away from anon
--   - The "images" Storage bucket and its policies: see images.sql

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  avatar_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_avatar_url_valid CHECK (avatar_url ~* '^https://'::text AND char_length(avatar_url) <= 2000)
);
CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cuisine text,
  rating numeric(2,1),
  delivery_time text,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  image text,
  description text,
  tags text[],
  address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  owner_id uuid,
  published boolean NOT NULL DEFAULT false,
  requested_name text,
  accepting_orders boolean NOT NULL DEFAULT true,
  opening_hours jsonb,
  CONSTRAINT restaurants_pkey PRIMARY KEY (id),
  CONSTRAINT restaurants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT restaurants_text_lengths CHECK (char_length(btrim(name)) >= 1 AND char_length(btrim(name)) <= 100 AND char_length(cuisine) <= 50 AND char_length(address) <= 200 AND char_length(description) <= 1000 AND char_length(delivery_time) <= 30 AND char_length(image) <= 2000),
  CONSTRAINT restaurants_delivery_fee_range CHECK (delivery_fee >= 0::numeric AND delivery_fee < 100::numeric AND delivery_fee = round(delivery_fee, 2)),
  CONSTRAINT restaurants_image_https CHECK (image ~* '^https://'::text),
  CONSTRAINT restaurants_requested_name_length CHECK (char_length(btrim(requested_name)) >= 1 AND char_length(btrim(requested_name)) <= 100),
  CONSTRAINT restaurants_opening_hours_valid CHECK (valid_opening_hours(opening_hours))
);
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL,
  description text,
  category text,
  image text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  available boolean NOT NULL DEFAULT true,
  position integer,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE,
  CONSTRAINT menu_items_text_lengths CHECK (char_length(btrim(name)) >= 1 AND char_length(btrim(name)) <= 100 AND char_length(category) <= 50 AND char_length(description) <= 500 AND char_length(image) <= 2000),
  CONSTRAINT menu_items_price_range CHECK (price > 0::numeric AND price < 1000::numeric AND price = round(price, 2)),
  CONSTRAINT menu_items_image_https CHECK (image ~* '^https://'::text),
  CONSTRAINT menu_items_options_valid CHECK (valid_menu_options(options))
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  items jsonb NOT NULL,
  total numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'placed'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  customer_name text,
  phone text,
  delivery_address text,
  note text,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  delivered_at timestamp with time zone,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT orders_text_lengths CHECK (char_length(customer_name) <= 100 AND char_length(phone) <= 30 AND char_length(delivery_address) <= 200 AND char_length(note) <= 500),
  CONSTRAINT orders_status_valid CHECK (status = ANY (ARRAY['placed'::text, 'preparing'::text, 'delivering'::text, 'delivered'::text, 'cancelled'::text])),
  CONSTRAINT orders_delivered_at_valid CHECK (delivered_at IS NULL OR (status = 'delivered'::text AND delivered_at >= created_at))
);
