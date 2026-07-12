-- Library persistence + function hardening.
--
-- The library tables from 0006_library.sql were never applied to production
-- (its migration history recorded a different 0006). This re-applies that
-- state idempotently under a properly versioned migration, adds explicit
-- grants, and fixes the mutable search_path advisor warnings on trigger
-- functions.

-- ---------------------------------------------------------------------------
-- 1. Library saves and albums (idempotent re-application of 0006_library.sql)
-- ---------------------------------------------------------------------------

alter type saved_item_type add value if not exists 'source';
alter type saved_item_type add value if not exists 'external_link';

alter table saved_items
  add column if not exists title text,
  add column if not exists url text,
  add column if not exists description text,
  add column if not exists site_name text,
  add column if not exists related_type text,
  add column if not exists related_id text,
  add column if not exists related_name text;

do $$ begin
  create type library_album_privacy as enum ('private', 'public');
exception
  when duplicate_object then null;
end $$;

create table if not exists library_albums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  privacy library_album_privacy not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists library_album_items (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references library_albums (id) on delete cascade,
  saved_item_type saved_item_type not null,
  saved_item_id text not null,
  added_at timestamptz not null default now(),
  unique (album_id, saved_item_type, saved_item_id)
);

alter table library_albums enable row level security;
alter table library_album_items enable row level security;

drop policy if exists library_albums_read on library_albums;
create policy library_albums_read on library_albums for select
  using (privacy = 'public' or auth.uid() = owner_id);

drop policy if exists library_albums_owner_write on library_albums;
create policy library_albums_owner_write on library_albums for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists library_album_items_read on library_album_items;
create policy library_album_items_read on library_album_items for select
  using (exists (select 1 from library_albums a where a.id = album_id and (a.privacy = 'public' or a.owner_id = auth.uid())));

drop policy if exists library_album_items_owner_write on library_album_items;
create policy library_album_items_owner_write on library_album_items for all
  using (exists (select 1 from library_albums a where a.id = album_id and a.owner_id = auth.uid()))
  with check (exists (select 1 from library_albums a where a.id = album_id and a.owner_id = auth.uid()));

grant select on library_albums, library_album_items to anon;
grant select, insert, update, delete on library_albums, library_album_items to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Function hardening: pin search_path on trigger functions flagged by the
--    security advisor.
-- ---------------------------------------------------------------------------

alter function enforce_stack_component_count() set search_path = public;
alter function enforce_profile_username_rules() set search_path = public;
alter function touch_updated_at() set search_path = public;
alter function prevent_published_post_edits() set search_path = public;
alter function set_moderation_updated_at() set search_path = public;

-- profile_stats stays SECURITY DEFINER on purpose: it exposes only aggregate
-- counts while the follows table remains owner-private (product rule:
-- following lists are private, follower counts are public).
comment on view profile_stats is
  'SECURITY DEFINER by design: exposes only aggregate counts; follows rows stay owner-private.';

notify pgrst, 'reload schema';
