-- Private/public Library saves and albums.
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
