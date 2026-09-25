-- Zelfora: image uploads
-- One public Storage bucket for every uploaded image on the site (restaurant
-- photos, menu items, profile photos, and future kinds). How the frontend uses
-- it is described under "Images" in CLAUDE.md.
--
-- Run in Supabase Dashboard -> SQL Editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. The bucket
--    Public, so images load straight from the CDN without signed URLs. File
--    names are random and never reused, so they can be cached for a long time.
--    The browser resizes photos and saves them as WebP (or JPEG where the
--    browser can't write WebP) before uploading, so 5 MB is a generous cap.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5 * 1024 * 1024, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. Who may write
--    Every file lives under <user id>/<kind>/<random name>. Users can only add
--    and remove files in their own folder. Which row a file ends up on is
--    checked by that table's own RLS when its URL is saved, so new image
--    kinds need no new storage policies.
--    Reading needs no policy (the bucket is public); the select policy is
--    there because the Storage API reads a row before deleting it.
-- ---------------------------------------------------------------------------

drop policy if exists "Users upload images to their own folder" on storage.objects;
create policy "Users upload images to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users see their own images" on storage.objects;
create policy "Users see their own images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete their own images" on storage.objects;
create policy "Users delete their own images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- 3. Profile photos
--    Users can already update their own profiles row (policy created in the
--    dashboard), so no new policy is needed.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists profiles_avatar_url_valid;
alter table public.profiles add constraint profiles_avatar_url_valid check (
  avatar_url ~* '^https://' and char_length(avatar_url) <= 2000
) not valid;
