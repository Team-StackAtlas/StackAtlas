-- Real community posting system: Dispatches, Signals, comments, likes, reports, images, drafts.

create extension if not exists pgcrypto;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dispatch', 'signal')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  body text not null default '',
  entity_type text check (entity_type in ('substance', 'stack', 'brand')),
  entity_id text,
  bearings text[] not null default '{}',
  image_urls text[] not null default '{}',
  shared_age integer,
  shared_weight text,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_bearings_count check (array_length(bearings, 1) between 1 and 5 or status = 'draft'),
  constraint community_posts_images_count check (array_length(image_urls, 1) is null or array_length(image_urls, 1) <= 4),
  constraint community_dispatch_entity_required check (kind <> 'dispatch' or entity_type is not null),
  constraint community_signal_entity_optional check (kind <> 'signal' or entity_type is null or entity_type in ('substance','stack','brand'))
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  parent_id uuid references public.community_comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  body text not null check (char_length(trim(body)) > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_reply_level check (parent_id is null or parent_id <> id)
);

create table if not exists public.community_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  target_type text not null check (target_type in ('dispatch', 'signal', 'comment', 'reply')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  target_type text not null check (target_type in ('dispatch', 'signal', 'comment', 'reply')),
  target_id uuid not null,
  reason text not null check (reason in ('Spam','Abuse / Harassment','Dangerous Advice','False or Misleading Information','Off-topic','Duplicate','Other')),
  note text,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint community_reports_other_note check (reason <> 'Other' or char_length(trim(coalesce(note, ''))) >= 5)
);

create index if not exists community_posts_public_idx on public.community_posts (status, deleted_at, published_at desc);
create index if not exists community_posts_author_idx on public.community_posts (author_id, status, deleted_at);
create index if not exists community_posts_entity_idx on public.community_posts (entity_type, entity_id, status, deleted_at);
create index if not exists community_comments_post_idx on public.community_comments (post_id, parent_id, created_at);

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_reports enable row level security;

grant select on public.community_posts, public.community_comments, public.community_likes to anon, authenticated;
grant insert, update on public.community_posts, public.community_comments to authenticated;
grant insert, delete on public.community_likes to authenticated;
grant insert on public.community_reports to authenticated;
grant select, update on public.community_reports to authenticated;

drop policy if exists community_posts_public_read on public.community_posts;
create policy community_posts_public_read on public.community_posts for select
  using ((status = 'published' and deleted_at is null) or author_id = auth.uid());

drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own on public.community_posts for insert
  with check (author_id = auth.uid());

drop policy if exists community_posts_update_own on public.community_posts;
create policy community_posts_update_own on public.community_posts for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists community_comments_public_read on public.community_comments;
create policy community_comments_public_read on public.community_comments for select
  using (exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published' and p.deleted_at is null));

drop policy if exists community_comments_insert_own on public.community_comments;
create policy community_comments_insert_own on public.community_comments for insert
  with check (author_id = auth.uid());

drop policy if exists community_comments_update_own on public.community_comments;
create policy community_comments_update_own on public.community_comments for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists community_likes_public_read on public.community_likes;
create policy community_likes_public_read on public.community_likes for select using (true);

drop policy if exists community_likes_insert_own on public.community_likes;
create policy community_likes_insert_own on public.community_likes for insert with check (user_id = auth.uid());

drop policy if exists community_likes_delete_own on public.community_likes;
create policy community_likes_delete_own on public.community_likes for delete using (user_id = auth.uid());

drop policy if exists community_reports_insert_own on public.community_reports;
create policy community_reports_insert_own on public.community_reports for insert with check (reporter_id = auth.uid());

drop policy if exists community_reports_admin_read on public.community_reports;
create policy community_reports_admin_read on public.community_reports for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'));

drop policy if exists community_reports_admin_update on public.community_reports;
create policy community_reports_admin_update on public.community_reports for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'));

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists community_posts_touch_updated_at on public.community_posts;
create trigger community_posts_touch_updated_at before update on public.community_posts
  for each row execute function public.touch_updated_at();

drop trigger if exists community_comments_touch_updated_at on public.community_comments;
create trigger community_comments_touch_updated_at before update on public.community_comments
  for each row execute function public.touch_updated_at();


create or replace function public.prevent_published_post_edits() returns trigger language plpgsql as $$
begin
  if old.status = 'published' and old.deleted_at is null then
    if new.deleted_at is distinct from old.deleted_at
      and new.kind = old.kind
      and new.status = old.status
      and new.author_id = old.author_id
      and new.title = old.title
      and new.body = old.body
      and new.entity_type is not distinct from old.entity_type
      and new.entity_id is not distinct from old.entity_id
      and new.bearings = old.bearings
      and new.image_urls = old.image_urls
      and new.shared_age is not distinct from old.shared_age
      and new.shared_weight is not distinct from old.shared_weight
      and new.metadata = old.metadata then
      return new;
    end if;
    raise exception 'published_posts_are_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists community_posts_prevent_published_edits on public.community_posts;
create trigger community_posts_prevent_published_edits before update on public.community_posts
  for each row execute function public.prevent_published_post_edits();

create or replace function public.community_posts_with_counts(viewer_id uuid default null)
returns table (
  id uuid,
  kind text,
  status text,
  author_id uuid,
  title text,
  body text,
  entity_type text,
  entity_id text,
  bearings text[],
  image_urls text[],
  shared_age integer,
  shared_weight text,
  metadata jsonb,
  published_at timestamptz,
  created_at timestamptz,
  profiles jsonb,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean
)
language sql security definer set search_path = public as $$
  select
    p.id, p.kind, p.status, p.author_id, p.title, p.body, p.entity_type, p.entity_id,
    p.bearings, p.image_urls, p.shared_age, p.shared_weight, p.metadata, p.published_at, p.created_at,
    jsonb_build_object('username', pr.username, 'display_name', pr.display_name, 'is_verified', pr.is_verified) as profiles,
    (select count(*) from community_likes l where l.target_id = p.id and l.target_type = p.kind) as like_count,
    (select count(*) from community_comments c where c.post_id = p.id and c.deleted_at is null) as comment_count,
    exists (select 1 from community_likes l where l.target_id = p.id and l.target_type = p.kind and l.user_id = viewer_id) as liked_by_me
  from community_posts p
  join profiles pr on pr.id = p.author_id
  where p.status = 'published' and p.deleted_at is null
  order by p.published_at desc nulls last, p.created_at desc;
$$;

create or replace function public.community_post_with_counts(post_id uuid, viewer_id uuid default null)
returns table (
  id uuid,
  kind text,
  status text,
  author_id uuid,
  title text,
  body text,
  entity_type text,
  entity_id text,
  bearings text[],
  image_urls text[],
  shared_age integer,
  shared_weight text,
  metadata jsonb,
  published_at timestamptz,
  created_at timestamptz,
  profiles jsonb,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean
)
language sql security definer set search_path = public as $$
  select * from public.community_posts_with_counts(viewer_id) where id = post_id;
$$;

create or replace function public.community_comments_with_counts(post_id_arg uuid, viewer_id uuid default null)
returns table (
  id uuid,
  post_id uuid,
  parent_id uuid,
  author_id uuid,
  body text,
  deleted_at timestamptz,
  created_at timestamptz,
  profiles jsonb,
  like_count bigint,
  liked_by_me boolean
)
language sql security definer set search_path = public as $$
  select
    c.id, c.post_id, c.parent_id, c.author_id, c.body, c.deleted_at, c.created_at,
    jsonb_build_object('username', pr.username, 'display_name', pr.display_name, 'is_verified', pr.is_verified) as profiles,
    (select count(*) from community_likes l where l.target_id = c.id and l.target_type = case when c.parent_id is null then 'comment' else 'reply' end) as like_count,
    exists (select 1 from community_likes l where l.target_id = c.id and l.target_type = case when c.parent_id is null then 'comment' else 'reply' end and l.user_id = viewer_id) as liked_by_me
  from community_comments c
  join profiles pr on pr.id = c.author_id
  where c.post_id = post_id_arg
  order by coalesce(c.parent_id, c.id), c.created_at asc;
$$;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists post_images_public_read on storage.objects;
create policy post_images_public_read on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists post_images_auth_upload on storage.objects;
create policy post_images_auth_upload on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.uid() is not null);
