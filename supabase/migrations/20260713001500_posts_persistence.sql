-- Square/Create persistence on the repo `posts` schema.
--
-- Dispatches and Signals currently live in localStorage. This makes the
-- 0001 `posts` family writable and complete: author columns for PostgREST
-- profile embeds, dispatch protocol storage, soft delete, comments with
-- one-level replies, comment votes, seeded bearings vocabulary, and a
-- create_post RPC that resolves bearing labels server-side.
-- (The orphaned production `community_*` tables stay untouched; the repo
-- schema is the convergence target per the posts persistence audit.)

-- ---------------------------------------------------------------------------
-- 1. posts columns + relationships
-- ---------------------------------------------------------------------------

alter table posts add column if not exists subcategory text;
alter table posts add column if not exists dispatch_protocol jsonb;
alter table posts add column if not exists deleted_at timestamptz;
alter table posts add column if not exists updated_at timestamptz not null default now();

-- PostgREST needs a direct FK to embed profiles(username) from posts.
do $$ begin
  alter table posts
    add constraint posts_author_profile_fk
    foreign key (author_id) references profiles (id) on delete set null;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Comments (one-level replies via parent_id) + comment votes
-- ---------------------------------------------------------------------------

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  parent_id uuid references post_comments (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade default auth.uid(),
  body text not null check (char_length(trim(body)) > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index if not exists post_comments_post_idx on post_comments (post_id, created_at);

create table if not exists post_comment_votes (
  comment_id uuid not null references post_comments (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 3. RLS + grants
-- ---------------------------------------------------------------------------

alter table posts enable row level security;
alter table post_comments enable row level security;
alter table post_comment_votes enable row level security;

-- Public read of live posts (replaces the blanket read policy from 0016 so
-- soft-deleted posts disappear); authors keep reading their own.
drop policy if exists posts_public_read on posts;
create policy posts_public_read on posts for select
  using (deleted_at is null or auth.uid() = author_id or is_site_admin());

drop policy if exists posts_author_insert on posts;
create policy posts_author_insert on posts for insert
  with check (auth.uid() = author_id);

drop policy if exists posts_author_update on posts;
create policy posts_author_update on posts for update
  using (auth.uid() = author_id or is_site_admin())
  with check (auth.uid() = author_id or is_site_admin());

drop policy if exists post_comments_public_read on post_comments;
create policy post_comments_public_read on post_comments for select using (true);

drop policy if exists post_comments_author_insert on post_comments;
create policy post_comments_author_insert on post_comments for insert
  with check (auth.uid() = author_id);

drop policy if exists post_comments_author_update on post_comments;
create policy post_comments_author_update on post_comments for update
  using (auth.uid() = author_id or is_site_admin())
  with check (auth.uid() = author_id or is_site_admin());

drop policy if exists post_comment_votes_public_read on post_comment_votes;
create policy post_comment_votes_public_read on post_comment_votes for select using (true);

drop policy if exists post_comment_votes_owner_write on post_comment_votes;
create policy post_comment_votes_owner_write on post_comment_votes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- post_bearings rows follow their post's author.
drop policy if exists post_bearings_author_write on post_bearings;
create policy post_bearings_author_write on post_bearings for all
  using (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

grant insert, update on posts to authenticated;
grant select on post_comments, post_comment_votes to anon, authenticated;
grant insert, update on post_comments to authenticated;
grant insert, delete on post_comment_votes to authenticated;
grant insert, delete on post_bearings to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Bearings vocabulary seed (canonical labels used by the Create form)
-- ---------------------------------------------------------------------------

insert into bearings (slug, label)
select import_slugify(v), v
from unnest(array[
  'Sleep', 'Focus', 'Memory', 'Mood', 'Stress', 'Anxiety', 'Energy', 'Recovery',
  'Endurance', 'Strength', 'Fat Loss', 'Muscle Gain', 'Hormones', 'Testosterone',
  'Longevity', 'Gut Health', 'Nootropics', 'Supplements', 'Fasting', 'Biohacking',
  'Beginner Question', 'Stack Discussion', 'Protocol Discussion', 'Brand Experience',
  'Product Quality', 'Cost / Value', 'Research', 'General Discussion'
]) as v
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 5. create_post RPC: atomic insert + bearing resolution by label
-- ---------------------------------------------------------------------------

create or replace function create_post(p_post jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_kind text; v_ref text; v_bearing uuid;
  v_substance uuid; v_brand uuid; v_stack uuid;
begin
  if auth.uid() is null then raise exception 'sign in to post'; end if;
  v_kind := lower(nullif(btrim(p_post->>'kind'), ''));
  if v_kind not in ('dispatch', 'signal') then raise exception 'invalid kind: %', coalesce(v_kind, '(missing)'); end if;
  if nullif(btrim(p_post->>'title'), '') is null then raise exception 'title is required'; end if;
  if nullif(btrim(p_post->>'content'), '') is null then raise exception 'content is required'; end if;

  v_substance := import_resolve_substance(p_post->>'substance_slug');
  select id into v_brand from brands where slug = import_slugify(p_post->>'brand_slug');
  if nullif(btrim(p_post->>'stack_id'), '') is not null then
    select id into v_stack from stacks where id = (p_post->>'stack_id')::uuid;
  end if;

  insert into posts (kind, title, content, author_id, domain, category, subcategory,
                     substance_id, brand_id, stack_id, structured_content, log_details,
                     dispatch_protocol, quality_score, updated_at)
  values (
    v_kind::post_kind,
    btrim(p_post->>'title'),
    p_post->>'content',
    auth.uid(),
    nullif(btrim(p_post->>'domain'), ''),
    nullif(btrim(p_post->>'category'), ''),
    nullif(btrim(p_post->>'subcategory'), ''),
    v_substance, v_brand, v_stack,
    p_post->'structured_content',
    p_post->'log_details',
    p_post->'dispatch_protocol',
    coalesce(nullif(btrim(p_post->>'quality_score'), '')::integer, 0),
    now()
  )
  returning id into v_id;

  if jsonb_typeof(p_post->'bearings') = 'array' then
    for v_ref in select value #>> '{}' from jsonb_array_elements(p_post->'bearings') loop
      select id into v_bearing from bearings where slug = import_slugify(v_ref);
      if v_bearing is not null then
        insert into post_bearings (post_id, bearing_id) values (v_id, v_bearing) on conflict do nothing;
      end if;
    end loop;
  end if;

  return v_id;
end $$;

revoke all on function create_post(jsonb) from public, anon, authenticated;
grant execute on function create_post(jsonb) to authenticated;

notify pgrst, 'reload schema';
