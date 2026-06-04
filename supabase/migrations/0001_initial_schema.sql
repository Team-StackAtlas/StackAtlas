-- StackAtlas initial schema (Postgres / Supabase)
-- Foundation only. Apply with the Supabase CLI or psql.
-- RLS is enabled on user-owned tables with starter policies; full policy review
-- is a follow-up (search for "TODO(rls)").

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums (controlled values)
-- ---------------------------------------------------------------------------
create type classification as enum ('Everyday', 'Clinical', 'Frontier', 'Unknown');
create type research_scope as enum ('Citizen', 'Explorer');
create type post_kind as enum ('dispatch', 'signal');
create type stack_status as enum ('pending', 'approved', 'rejected');
create type review_status as enum ('pending', 'approved', 'rejected');
create type source_type as enum ('study', 'article', 'official', 'label', 'database', 'other');
create type source_section as enum (
  'summary', 'dosage', 'side_effects', 'brand_claim', 'ingredient',
  'testing', 'stack_description'
);
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type follow_target as enum ('user', 'substance', 'brand', 'stack');
create type saved_item_type as enum ('substance', 'brand', 'stack', 'dispatch', 'signal');
create type hideable_type as enum ('substance', 'brand', 'stack', 'tag');
-- Polymorphic object reference used by sources / reports / suggest_edits / moderation.
create type object_type as enum ('substance', 'brand', 'stack', 'post', 'ingredient', 'brand_product');

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
-- `users` mirrors the auth provider's user id (Supabase: auth.users.id).
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references users (id) on delete cascade,
  username text not null unique,
  display_name text,
  bio text,
  website text,
  research_scope research_scope not null default 'Citizen',
  is_verified boolean not null default false,
  verification_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Controlled vocabularies (lookup tables)
-- ---------------------------------------------------------------------------
create table type_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,        -- e.g. 'supplement'
  label text not null,              -- e.g. 'Supplement'
  emoji text
);

create table administration_methods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,        -- 'oral'
  label text not null               -- 'Oral'
);

create table markers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null
);

create table bearings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null
);

-- A category route is a (domain, category) pair, e.g. ('Mind', 'Focus').
create table category_routes (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  category text not null,
  unique (domain, category)
);

-- ---------------------------------------------------------------------------
-- Substances
-- ---------------------------------------------------------------------------
create table substances (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,        -- dedup key, e.g. 'magnesium-glycinate'
  name text not null,
  classification classification not null,
  description text not null,
  average_dosage text,
  length_of_cycle text,
  tolerance_buildup text,
  risk_level text check (risk_level in ('Low', 'Moderate', 'High')),
  most_popular_brand_id uuid,       -- FK added after brands exists
  formula text,                     -- retained internally; not rendered in v1
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table substance_routes (
  substance_id uuid not null references substances (id) on delete cascade,
  category_route_id uuid not null references category_routes (id) on delete restrict,
  primary key (substance_id, category_route_id)
);

create table substance_type_tags (
  substance_id uuid not null references substances (id) on delete cascade,
  type_tag_id uuid not null references type_tags (id) on delete restrict,
  primary key (substance_id, type_tag_id)
);

create table substance_administration_methods (
  substance_id uuid not null references substances (id) on delete cascade,
  administration_method_id uuid not null references administration_methods (id) on delete restrict,
  primary key (substance_id, administration_method_id)
);

create table substance_markers (
  substance_id uuid not null references substances (id) on delete cascade,
  marker_id uuid not null references markers (id) on delete restrict,
  primary key (substance_id, marker_id)
);

create table substance_pairings (
  substance_id uuid not null references substances (id) on delete cascade,
  pairs_with_id uuid not null references substances (id) on delete cascade,
  primary key (substance_id, pairs_with_id),
  check (substance_id <> pairs_with_id)
);

create table substance_effects (
  id uuid primary key default gen_random_uuid(),
  substance_id uuid not null references substances (id) on delete cascade,
  kind text not null check (kind in ('subjective_effect', 'health_risk')),
  value text not null
);

-- ---------------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------------
create table brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  shipping_reliability numeric(2,1) check (shipping_reliability between 0 and 5),
  contamination_reports integer not null default 0 check (contamination_reports >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table substances
  add constraint substances_most_popular_brand_fk
  foreign key (most_popular_brand_id) references brands (id) on delete set null;

create table brand_products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  substance_id uuid references substances (id) on delete set null,
  name text not null,
  unique (brand_id, name)
);

create table brand_ingredients (
  id uuid primary key default gen_random_uuid(),
  brand_product_id uuid not null references brand_products (id) on delete cascade,
  name text not null,
  amount text
);

create table brand_health_labels (
  id uuid primary key default gen_random_uuid(),
  brand_product_id uuid not null references brand_products (id) on delete cascade,
  label text not null               -- e.g. 'Third-Party Tested', 'Non-GMO'
);

-- Per-user 1–5 star ratings; aggregate is computed, not stored.
create table brand_star_ratings (
  brand_id uuid not null references brands (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (brand_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Stacks
-- ---------------------------------------------------------------------------
create table stacks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  creator_id uuid references users (id) on delete set null,
  status stack_status not null default 'pending',
  -- Normalized, sorted hash of component substance ids; dedup key.
  component_signature text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stack_components (
  stack_id uuid not null references stacks (id) on delete cascade,
  substance_id uuid not null references substances (id) on delete restrict,
  primary key (stack_id, substance_id)
);

-- Enforce 2–10 components per stack (deferred to commit so inserts can batch).
create or replace function enforce_stack_component_count() returns trigger
language plpgsql as $$
declare
  cnt integer;
  sid uuid;
begin
  sid := coalesce(new.stack_id, old.stack_id);
  select count(*) into cnt from stack_components where stack_id = sid;
  if cnt < 2 or cnt > 10 then
    raise exception 'Stack % must have between 2 and 10 components (has %)', sid, cnt;
  end if;
  return null;
end;
$$;

create constraint trigger stack_component_count
  after insert or delete on stack_components
  deferrable initially deferred
  for each row execute function enforce_stack_component_count();

-- ---------------------------------------------------------------------------
-- Posts (Dispatches + Signals)
-- ---------------------------------------------------------------------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  kind post_kind not null,
  title text not null,
  content text not null,
  author_id uuid references users (id) on delete set null,
  domain text,
  category text,
  substance_id uuid references substances (id) on delete set null,
  brand_id uuid references brands (id) on delete set null,
  stack_id uuid references stacks (id) on delete set null,
  is_gold boolean not null default false,
  quality_score integer not null default 0,
  structured_content jsonb,
  log_details jsonb,
  created_at timestamptz not null default now()
);

create view dispatches as select * from posts where kind = 'dispatch';
create view signals as select * from posts where kind = 'signal';

create table post_bearings (
  post_id uuid not null references posts (id) on delete cascade,
  bearing_id uuid not null references bearings (id) on delete restrict,
  primary key (post_id, bearing_id)
);

create table post_votes (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Sources (polymorphic, attach to any object + optional section/claim)
-- ---------------------------------------------------------------------------
create table sources (
  id uuid primary key default gen_random_uuid(),
  target_type object_type not null,
  target_id uuid not null,
  section source_section,
  claim text,
  title text not null,
  url text not null check (url ~* '^https?://[^ ]+\.[^ ]+'),
  source_type source_type not null default 'other',
  publisher text,
  accessed_at date,
  created_at timestamptz not null default now()
);
create index sources_target_idx on sources (target_type, target_id);

-- ---------------------------------------------------------------------------
-- Community / user-owned
-- ---------------------------------------------------------------------------
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references users (id) on delete set null,
  target_type object_type not null,
  target_id uuid not null,
  target_name text,
  category text not null,
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table suggest_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete set null,
  target_type object_type not null,
  target_id uuid not null,
  sources text,
  details text not null,
  status review_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table saved_items (
  user_id uuid not null references users (id) on delete cascade,
  item_type saved_item_type not null,
  item_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

create table hidden_items (
  user_id uuid not null references users (id) on delete cascade,
  item_type hideable_type not null,
  item_id text not null,
  tag_type text,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

create table follows (
  follower_id uuid not null references users (id) on delete cascade,
  target_type follow_target not null,
  target_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, target_type, target_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table moderation_queue (
  id uuid primary key default gen_random_uuid(),
  target_type object_type not null,
  target_id uuid not null,
  reason text not null,
  status review_status not null default 'pending',
  assignee_id uuid references users (id) on delete set null,
  source_report_id uuid references reports (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Row-Level Security (starter — TODO(rls): complete policy review)
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table saved_items enable row level security;
alter table hidden_items enable row level security;
alter table follows enable row level security;
alter table post_votes enable row level security;
alter table brand_star_ratings enable row level security;
alter table notifications enable row level security;

-- Profiles: public read, owner write.
create policy profiles_read on profiles for select using (true);
create policy profiles_write on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- Owner-only collections.
create policy saved_owner on saved_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy hidden_owner on hidden_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy follows_owner on follows for all
  using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy notifications_owner on notifications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Votes / ratings: public read, owner write.
create policy post_votes_read on post_votes for select using (true);
create policy post_votes_write on post_votes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy brand_ratings_read on brand_star_ratings for select using (true);
create policy brand_ratings_write on brand_star_ratings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
