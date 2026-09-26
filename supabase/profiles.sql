-- Zelfora: profiles
-- One row per user account, with the same id as the auth user, created on
-- signup by the on_auth_user_created trigger (section 3). Users read their
-- own row and can change only their profile photo.
--
-- The table, its policies and the trigger were first set up in the
-- dashboard; this file has them all, so the project can be rebuilt from the
-- repo. Run in Supabase Dashboard -> SQL Editor FIRST: restaurants and orders
-- refer to profiles. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. The table
--    email copies the account's sign-in address at signup. avatar_url is a
--    profile photo: a pasted link or an upload in the images bucket (see
--    images.sql), https only.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists profiles_avatar_url_valid;
alter table public.profiles add constraint profiles_avatar_url_valid check (
  avatar_url ~* '^https://' and char_length(avatar_url) <= 2000
) not valid;

-- ---------------------------------------------------------------------------
-- 2. Row Level Security
--    Users see and update only their own row, and of that only the photo:
--    rows are added by the trigger below and never deleted from the app.
--    (Revoking the table-wide privileges first also clears earlier column
--    grants, so this is re-runnable.)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke insert, update, delete on public.profiles from authenticated;
grant update (avatar_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 3. A profile for every new user
--    security definer, because the new user can't insert profiles rows
--    themselves (see "Settled decisions" in CLAUDE.md about the advisor
--    warning this causes).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Created only when missing, so re-running this file doesn't touch the
-- trigger on auth.users.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end;
$$;
