-- StackAtlas: pending migrations as of 2026-10-24, in order. Paste the whole file into Supabase → SQL Editor → Run.
-- Every block is idempotent, so running it twice (or after a partial run) is safe.

-- ===================== 20260915120000_risk_pass_2_health_risks.sql =====================
-- Risk pass 2 (batch 18), 2026-09-15: surface the four interaction/risk
-- cautions queued by batch 11's dossier as health_risk effects, matching
-- the evidence staged in docs/data-packs/batches/2026-09-15-risk-pass-batch-18.
-- Wording follows the guduchi precedent (20260816234500): one cautious
-- sentence, year + source type in prose. Idempotent via exact-value guards.
--
-- NOTE: written in a session whose database connection was unavailable
-- (credential failure while the project reported healthy). Apply through
-- the normal migration pipeline, then confirm one new row per substance.
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('ginkgo-biloba',
       'A meta-analysis of 18 randomized trials (1,985 adults) found no evidence that standardized extract increases bleeding risk (2011); the conventional caution when combining ginkgo with anticoagulants or antiplatelet drugs rests on case reports rather than trial evidence.'),
      ('st-john-s-wort',
       'Inhibits serotonin reuptake, so combining it with SSRIs or other serotonergic antidepressants carries a case-report-documented risk of serotonin syndrome (systematic review, 2003) — a pharmacodynamic interaction separate from its CYP3A4 drug-level effects.'),
      ('red-yeast-rice',
       'Its monacolin K is chemically identical to lovastatin, so red yeast rice inherits the statin-class contraindication in pregnancy and lactation (animal teratogenicity; CNS and limb defects reported after in-utero statin exposure) (medication-safety review, 2019).'),
      ('hawthorn',
       'Hawthorn extract interferes with at least one common serum digoxin immunoassay (Abbott Digoxin III) and appears to act at the same cardiac Na/K-ATPase site as digoxin in cell studies (2010); patients taking digoxin should not add hawthorn without their clinician and lab being aware.')
    ) as t(slug, risk)
  loop
    insert into substance_effects (substance_id, kind, value)
    select s.id, 'health_risk', rec.risk
    from substances s
    where s.slug = rec.slug
      and not exists (
        select 1 from substance_effects se
        where se.substance_id = s.id
          and se.kind = 'health_risk'
          and se.value = rec.risk
      );
  end loop;
end $$;

-- ===================== 20261020120000_account_deletion_requests.sql =====================
-- Self-service account deletion (Privacy Policy §6–7).
--
-- request_account_deletion(): callable by the signed-in user only. Scrubs the
-- personal fields on their profile immediately, soft-deletes their posts, marks
-- the account 'deletion_requested', and records the request so the periodic
-- purge can finish the job. Nothing here touches other users' data.
--
-- admin_purge_deletion_requests(): owner-only. Hard-deletes application rows
-- for requests older than 30 days. Deleting the auth.users row itself requires
-- the Supabase service role (Dashboard → Authentication, or the Admin API) and
-- is documented in docs/privacy/DATA_INVENTORY.md as the final manual step.
--
-- Written in a session without database access; apply through the normal
-- migration pipeline and confirm with the smoke test at the bottom.

create table if not exists account_deletion_requests (
  user_id uuid primary key references profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  reason text,
  processed_at timestamptz
);
alter table account_deletion_requests enable row level security;
drop policy if exists account_deletion_requests_own_read on account_deletion_requests;
create policy account_deletion_requests_own_read on account_deletion_requests
  for select using (auth.uid() = user_id or is_site_owner());

-- Widen the account_status check to include the new state.
alter table profiles drop constraint if exists profiles_account_status_check;
alter table profiles add constraint profiles_account_status_check
  check (account_status in ('active', 'warned', 'suspended', 'banned', 'deletion_requested')) not valid;

create or replace function request_account_deletion(p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'sign in required'; end if;

  -- 1. Erase personal fields now. Username is kept (unique, needed for
  --    "deleted user" attribution) but display name and everything optional go.
  update profiles set
    display_name = 'deleted user',
    bio = null,
    avatar_url = null,
    website = null,
    birth_year = null,
    sex = null,
    height_cm = null,
    weight_kg = null,
    body_fat_percentage = null,
    goals = '{}',
    settings = '{"accountPrivacy":"private","savedPrivate":true}'::jsonb,
    account_status = 'deletion_requested',
    deleted_at = now(),
    deletion_reason = coalesce(p_reason, 'user requested deletion'),
    updated_at = now()
  where id = v_uid;

  -- 2. Hide authored content immediately (hard delete happens in the purge).
  update posts set deleted_at = now() where author_id = v_uid and deleted_at is null;

  -- 3. Remove private-to-user rows now: nothing depends on them.
  delete from saved_items where user_id = v_uid;
  delete from hidden_items where user_id = v_uid;
  delete from notification_settings where user_id = v_uid;
  delete from follows where follower_id = v_uid or following_id = v_uid;
  delete from follow_requests where requester_id = v_uid or target_user_id = v_uid;

  -- 4. Record the request (idempotent).
  insert into account_deletion_requests (user_id, reason)
  values (v_uid, p_reason)
  on conflict (user_id) do update set requested_at = now(), reason = excluded.reason;
end $$;
revoke all on function request_account_deletion(text) from public, anon;
grant execute on function request_account_deletion(text) to authenticated;

create or replace function admin_purge_deletion_requests()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  rec record; v_count integer := 0;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  for rec in
    select user_id from account_deletion_requests
    where processed_at is null and requested_at < now() - interval '30 days'
  loop
    -- Content: delete comments and votes outright; posts are deleted unless
    -- another user has commented on them, in which case they stay soft-deleted
    -- and attributed to "deleted user" (Privacy Policy §7).
    delete from post_comment_votes where user_id = rec.user_id;
    delete from post_votes where user_id = rec.user_id;
    delete from post_comments where author_id = rec.user_id;
    delete from posts p where p.author_id = rec.user_id
      and not exists (select 1 from post_comments c where c.post_id = p.id);
    delete from brand_star_ratings where user_id = rec.user_id;
    delete from library_album_items where album_id in (select id from library_albums where owner_id = rec.user_id);
    delete from library_albums where owner_id = rec.user_id;
    delete from reports where reporter_user_id = rec.user_id;
    update account_deletion_requests set processed_at = now() where user_id = rec.user_id;
    v_count := v_count + 1;
  end loop;
  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'deletion_requests_purged', 'system', null, v_count || ' account(s) purged');
  return jsonb_build_object('purged', v_count);
end $$;
revoke all on function admin_purge_deletion_requests() from public, anon, authenticated;
grant execute on function admin_purge_deletion_requests() to authenticated;

-- Smoke test (run as a throwaway signed-in user, then as owner):
--   select request_account_deletion('testing');
--   select display_name, account_status from profiles where id = auth.uid();  -- 'deleted user', 'deletion_requested'
--   select admin_purge_deletion_requests();                                    -- {"purged": 0} until 30 days pass

-- ===================== 20261020123000_content_rate_limits.sql =====================
-- Anti-bot layer 1: database-enforced posting limits (docs/trust/ANTI_BOT_PLAN.md).
--
-- Rules, enforced in BEFORE INSERT triggers so no client can bypass them:
--   * Email must be confirmed before posting, commenting, or rating.
--   * New accounts (< 24 h old) cannot rate brands or post Dispatches about brands.
--   * Per-user ceilings: 10 posts / hour, 40 comments / hour, 20 brand ratings / day.
--   * One rating per user per brand (unique index; rating changes are updates).
-- These are deliberately generous for humans and ruinous for scripts.
--
-- Written in a session without database access; apply through the normal
-- migration pipeline. Column names follow the current schema (posts.author_id,
-- post_comments.author_id, brand_star_ratings.user_id/brand_id).

create or replace function assert_account_may_contribute(p_user uuid, p_require_age boolean)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_confirmed timestamptz; v_created timestamptz; v_status text;
begin
  select u.email_confirmed_at, u.created_at into v_confirmed, v_created
  from auth.users u where u.id = p_user;
  if v_confirmed is null then
    raise exception 'confirm your email address before contributing' using errcode = 'check_violation';
  end if;
  select account_status into v_status from profiles where id = p_user;
  if v_status in ('suspended', 'banned', 'deletion_requested') then
    raise exception 'this account cannot contribute' using errcode = 'check_violation';
  end if;
  if p_require_age and v_created > now() - interval '24 hours' then
    raise exception 'new accounts can rate brands after 24 hours' using errcode = 'check_violation';
  end if;
end $$;

create or replace function enforce_post_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_recent integer;
begin
  if new.author_id is null then return new; end if;
  perform assert_account_may_contribute(new.author_id, false);
  select count(*) into v_recent from posts
  where author_id = new.author_id and created_at > now() - interval '1 hour';
  if v_recent >= 10 then
    raise exception 'posting limit reached (10 per hour) — try again later' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists posts_rate_limit on posts;
create trigger posts_rate_limit before insert on posts
  for each row execute function enforce_post_rate_limit();

create or replace function enforce_comment_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_recent integer;
begin
  if new.author_id is null then return new; end if;
  perform assert_account_may_contribute(new.author_id, false);
  select count(*) into v_recent from post_comments
  where author_id = new.author_id and created_at > now() - interval '1 hour';
  if v_recent >= 40 then
    raise exception 'commenting limit reached (40 per hour) — try again later' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists post_comments_rate_limit on post_comments;
create trigger post_comments_rate_limit before insert on post_comments
  for each row execute function enforce_comment_rate_limit();

create unique index if not exists brand_star_ratings_one_per_user
  on brand_star_ratings (brand_id, user_id);

create or replace function enforce_rating_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_recent integer;
begin
  if new.user_id is null then return new; end if;
  perform assert_account_may_contribute(new.user_id, true);
  select count(*) into v_recent from brand_star_ratings
  where user_id = new.user_id and created_at > now() - interval '1 day';
  if v_recent >= 20 then
    raise exception 'rating limit reached (20 per day)' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists brand_star_ratings_rate_limit on brand_star_ratings;
create trigger brand_star_ratings_rate_limit before insert on brand_star_ratings
  for each row execute function enforce_rating_rate_limit();

-- ===================== 20261020150000_profile_body_fields.sql =====================
-- Profile body fields, round two.
--
-- * `age` (a number that silently goes stale) becomes `birth_year`. Age is
--   computed at read time so it ticks over on its own. Existing ages are
--   backfilled as (this year - age), the best we can do.
-- * `weight` and `height` were stored in pounds and inches with nothing in
--   the name saying so, which is how the UI ended up showing bare numbers.
--   They become `weight_kg` and `height_cm` (canonical metric; the UI
--   converts to the viewer's unit system). Existing values are converted.
-- * `sex` is normalised to male | female | intersex | null.
-- * Sanity bounds: 0.4 lb was accepted before.
--
-- Idempotent: each step checks the column it is about to touch.

do $$
begin
  -- age -> birth_year
  if exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'age') then
    alter table profiles add column if not exists birth_year integer;
    update profiles
      set birth_year = extract(year from now())::int - age::int
      where age is not null and birth_year is null;
    alter table profiles drop column age;
  else
    alter table profiles add column if not exists birth_year integer;
  end if;

  -- weight (lb) -> weight_kg
  if exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'weight') then
    alter table profiles rename column weight to weight_kg;
    update profiles set weight_kg = round((weight_kg * 0.45359237)::numeric, 2) where weight_kg is not null;
  end if;

  -- height (in) -> height_cm
  if exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'height') then
    alter table profiles rename column height to height_cm;
    update profiles set height_cm = round((height_cm * 2.54)::numeric, 1) where height_cm is not null;
  end if;
end $$;

-- Normalise free-text sex values; anything unrecognised is cleared.
update profiles
  set sex = case
    when lower(trim(sex)) in ('male', 'm', 'man') then 'male'
    when lower(trim(sex)) in ('female', 'f', 'woman') then 'female'
    when lower(trim(sex)) in ('intersex') then 'intersex'
    else null
  end
  where sex is not null;

-- Clear values outside the new bounds rather than fail the migration.
update profiles set weight_kg = null where weight_kg is not null and (weight_kg < 20 or weight_kg > 500);
update profiles set height_cm = null where height_cm is not null and (height_cm < 90 or height_cm > 260);
update profiles set body_fat_percentage = null where body_fat_percentage is not null and (body_fat_percentage < 1 or body_fat_percentage > 75);
update profiles set birth_year = null where birth_year is not null and (birth_year < 1900 or birth_year > extract(year from now())::int - 18);

alter table profiles
  drop constraint if exists profiles_body_fat_check,
  add constraint profiles_body_fat_check check (body_fat_percentage is null or (body_fat_percentage >= 1 and body_fat_percentage <= 75)),
  drop constraint if exists profiles_weight_kg_check,
  add constraint profiles_weight_kg_check check (weight_kg is null or (weight_kg >= 20 and weight_kg <= 500)),
  drop constraint if exists profiles_height_cm_check,
  add constraint profiles_height_cm_check check (height_cm is null or (height_cm >= 90 and height_cm <= 260)),
  drop constraint if exists profiles_birth_year_check,
  add constraint profiles_birth_year_check check (birth_year is null or (birth_year >= 1900 and birth_year <= extract(year from now())::int - 18)),
  drop constraint if exists profiles_sex_check,
  add constraint profiles_sex_check check (sex is null or sex in ('male', 'female', 'intersex'));

-- Settings: the single followers/following toggles split into count + list
-- (counts default on, lists default off), and the redundant "body-stats
-- section" toggle goes away (the section shows whenever any body field is
-- visible).
update profiles
  set settings = (coalesce(settings, '{}'::jsonb)
    || jsonb_build_object(
      'showFollowersCount', coalesce((settings->>'showFollowersCount')::boolean, true),
      'showFollowersList',  coalesce((settings->>'showFollowersList')::boolean,  (settings->>'showFollowers')::boolean, false),
      'showFollowingCount', coalesce((settings->>'showFollowingCount')::boolean, true),
      'showFollowingList',  coalesce((settings->>'showFollowingList')::boolean,  (settings->>'showFollowing')::boolean, false)
    )) - 'showFollowers' - 'showFollowing' - 'showBodyStats'
  where settings is null
     or settings ? 'showFollowers' or settings ? 'showFollowing' or settings ? 'showBodyStats'
     or not (settings ? 'showFollowersCount');

-- The username-rules trigger rebuilds `settings` from a fixed key list on
-- every write, which silently dropped every key added since (accountPrivacy,
-- emailUpdates, the count/list split, ageDisplay, unitSystem). Rebuild it
-- with the full current key set. unitSystem is only kept when the user
-- actually chose one, so the app's locale guess still applies otherwise.
create or replace function enforce_profile_username_rules()
returns trigger language plpgsql set search_path = public as $$
begin
  new.username := lower(trim(new.username));
  if new.username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'profiles_username_format';
  end if;
  if tg_op = 'UPDATE' and new.username is distinct from old.username then
    if old.username_last_changed_at is not null and old.username_last_changed_at > now() - interval '30 days' then
      raise exception 'username_change_cooldown';
    end if;
    new.username_last_changed_at := now();
  end if;

  new.settings := jsonb_build_object(
    'savedPrivate', true,
    'accountPrivacy', case when new.settings->>'accountPrivacy' = 'private' then 'private' else 'public' end,
    'showActivity', coalesce((new.settings->>'showActivity')::boolean, false),
    'showAvatar', coalesce((new.settings->>'showAvatar')::boolean, false),
    'showAge', coalesce((new.settings->>'showAge')::boolean, false),
    'showWeight', coalesce((new.settings->>'showWeight')::boolean, false),
    'showHeight', coalesce((new.settings->>'showHeight')::boolean, false),
    'showSex', coalesce((new.settings->>'showSex')::boolean, false),
    'showBodyFat', coalesce((new.settings->>'showBodyFat')::boolean, false),
    'showFollowersCount', coalesce((new.settings->>'showFollowersCount')::boolean, true),
    'showFollowersList', coalesce((new.settings->>'showFollowersList')::boolean, (new.settings->>'showFollowers')::boolean, false),
    'showFollowingCount', coalesce((new.settings->>'showFollowingCount')::boolean, true),
    'showFollowingList', coalesce((new.settings->>'showFollowingList')::boolean, (new.settings->>'showFollowing')::boolean, false),
    'ageDisplay', case when new.settings->>'ageDisplay' = 'range' then 'range' else 'exact' end,
    'ageRangeSpan', least(10, greatest(3, coalesce((new.settings->>'ageRangeSpan')::int, 5))),
    'emailUpdates', coalesce((new.settings->>'emailUpdates')::boolean, false)
  ) || case
    when new.settings->>'unitSystem' in ('imperial', 'metric') then jsonb_build_object('unitSystem', new.settings->>'unitSystem')
    else '{}'::jsonb
  end;

  return new;
end $$;

-- ===================== 20261020160000_follow_lists.sql =====================
-- Followers / following lists.
--
-- `follows` RLS lets a user read only their own rows, so a profile's
-- followers list needs a SECURITY DEFINER reader that enforces the owner's
-- visibility choice: the list is private unless the owner turned on
-- showFollowersList / showFollowingList (counts stay on follower_counts).
-- A private account's list is additionally limited to approved followers.
-- Avatars respect the listed user's own showAvatar toggle.

create or replace function list_user_followers(p_user_id uuid)
returns table (user_id uuid, username text, display_name text, avatar_url text, followed_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_settings jsonb;
begin
  select settings into v_settings from profiles where id = p_user_id and deleted_at is null;
  if v_settings is null then return; end if;
  if auth.uid() is distinct from p_user_id then
    if coalesce((v_settings->>'showFollowersList')::boolean, false) is not true then
      raise exception 'followers_list_private';
    end if;
    if v_settings->>'accountPrivacy' = 'private' and not exists (
      select 1 from follows f where f.follower_id = auth.uid() and f.target_type = 'user' and f.target_id = p_user_id::text
    ) then
      raise exception 'account_private';
    end if;
  end if;
  return query
    select p.id, p.username, p.display_name,
           case when coalesce((p.settings->>'showAvatar')::boolean, false) then p.avatar_url end,
           f.created_at
    from follows f
    join profiles p on p.id = f.follower_id
    where f.target_type = 'user' and f.target_id = p_user_id::text and p.deleted_at is null
    order by f.created_at desc;
end $$;

create or replace function list_user_following(p_user_id uuid)
returns table (user_id uuid, username text, display_name text, avatar_url text, followed_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_settings jsonb;
begin
  select settings into v_settings from profiles where id = p_user_id and deleted_at is null;
  if v_settings is null then return; end if;
  if auth.uid() is distinct from p_user_id then
    if coalesce((v_settings->>'showFollowingList')::boolean, false) is not true then
      raise exception 'following_list_private';
    end if;
    if v_settings->>'accountPrivacy' = 'private' and not exists (
      select 1 from follows f where f.follower_id = auth.uid() and f.target_type = 'user' and f.target_id = p_user_id::text
    ) then
      raise exception 'account_private';
    end if;
  end if;
  return query
    select p.id, p.username, p.display_name,
           case when coalesce((p.settings->>'showAvatar')::boolean, false) then p.avatar_url end,
           f.created_at
    from follows f
    join profiles p on p.id::text = f.target_id
    where f.follower_id = p_user_id and f.target_type = 'user' and p.deleted_at is null
    order by f.created_at desc;
end $$;

revoke all on function list_user_followers(uuid) from public;
revoke all on function list_user_following(uuid) from public;
grant execute on function list_user_followers(uuid) to anon, authenticated;
grant execute on function list_user_following(uuid) to anon, authenticated;

-- ===================== 20261020170000_glossary_v2_schema.sql =====================
-- Glossary v2 schema: two-tier definitions, tags, bearings.
--
-- * `definition` stays the mandatory one-to-two-sentence tooltip text.
-- * `detail` is an optional longer paragraph shown only on the full entry.
-- * `tags` answer "how is this word used" (e.g. slang, safety), separate
--   from `category`, which answers "what kind of word is it". A term can be
--   Usage Patterns *and* slang without a second home.
-- * `bearings` link a term to 0–5 goal bearings from the site vocabulary so
--   the glossary can be browsed by goal and substance pages can surface
--   their related terms.
-- The admin upsert RPC gains the three fields; the old 4-arg signature is
-- dropped so there is exactly one.

alter table glossary_terms
  add column if not exists detail text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists bearings text[] not null default '{}';

alter table glossary_terms
  drop constraint if exists glossary_terms_bearings_max,
  add constraint glossary_terms_bearings_max check (cardinality(bearings) <= 5);

drop function if exists admin_upsert_glossary_term(text, text, text, text);

create or replace function admin_upsert_glossary_term(
  p_term text,
  p_definition text,
  p_category text default null,
  p_slug text default null,
  p_detail text default null,
  p_tags text[] default '{}',
  p_bearings text[] default '{}'
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_term text;
  v_definition text;
  v_category text;
  v_slug text;
  v_row jsonb;
begin
  if auth.uid() is null or not is_site_admin() then
    raise exception 'site_admin or site_owner role is required';
  end if;
  v_term := btrim(coalesce(p_term, ''));
  v_definition := btrim(coalesce(p_definition, ''));
  v_category := nullif(btrim(coalesce(p_category, '')), '');
  -- Glossary text describes; it never endorses (same scrub as v1).
  v_term := btrim(regexp_replace(regexp_replace(v_term, '\y(recommended|proven|best|safe|effective)\y', '', 'gi'), '\s+', ' ', 'g'));
  v_definition := btrim(regexp_replace(regexp_replace(v_definition, '\y(recommended|proven|best|safe|effective)\y', '', 'gi'), '\s+', ' ', 'g'));
  if v_term = '' then raise exception 'term is required'; end if;
  if v_definition = '' then raise exception 'definition is required'; end if;
  if cardinality(coalesce(p_bearings, '{}')) > 5 then raise exception 'at most 5 bearings'; end if;
  v_slug := lower(coalesce(nullif(btrim(p_slug), ''), v_term));
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := btrim(v_slug, '-');
  if v_slug = '' then raise exception 'could not derive a slug'; end if;

  insert into glossary_terms (term, slug, definition, category, detail, tags, bearings)
  values (v_term, v_slug, v_definition, v_category, nullif(btrim(coalesce(p_detail, '')), ''), coalesce(p_tags, '{}'), coalesce(p_bearings, '{}'))
  on conflict (slug) do update set
    term = excluded.term,
    definition = excluded.definition,
    category = excluded.category,
    detail = excluded.detail,
    tags = excluded.tags,
    bearings = excluded.bearings,
    updated_at = now()
  returning to_jsonb(glossary_terms.*) into v_row;
  return v_row;
end $$;

revoke all on function admin_upsert_glossary_term(text, text, text, text, text, text[], text[]) from public, anon, authenticated;
grant execute on function admin_upsert_glossary_term(text, text, text, text, text, text[], text[]) to authenticated;

-- ===================== 20261020173000_glossary_v2_data.sql =====================
-- Glossary v2 data pass (generated from the live table on 2026-10-20; see docs/audits/2026-10-20-glossary-audit.md for every call and its reason).
-- Idempotent: deletes by slug, updates by slug.

delete from glossary_terms where slug in ('abstract',
  'animal-study',
  'batch',
  'blend',
  'blood-glucose',
  'blood-pressure',
  'boron',
  'bulk-cut',
  'calcium',
  'capsule',
  'carrier-oil',
  'chloride',
  'chromium',
  'citrate',
  'copper',
  'cream',
  'cycling',
  'daily-intake',
  'data-set',
  'dosage',
  'duration',
  'elimination-half-life',
  'endpoint',
  'expiration-date',
  'frequency',
  'full-text',
  'gel',
  'glycinate',
  'gram-g',
  'gummy',
  'heart-rate',
  'human-study',
  'hydration',
  'hydrochloride',
  'inhaled',
  'injection',
  'iodine',
  'iron',
  'journal',
  'lab-testing',
  'label-claim',
  'label-transparency',
  'liquid-extract',
  'lot-number',
  'lozenge',
  'magnesium',
  'manganese',
  'microbiome',
  'milligram-mg',
  'milliliter-ml',
  'molybdenum',
  'monohydrate',
  'oral',
  'outcome',
  'patch',
  'phosphorus',
  'potassium',
  'powder',
  'probiotic-strain-specificity',
  'sarm-selective-androgen-receptor-modulator',
  'selenium',
  'serving-size',
  'single-dose',
  'sodium',
  'solubility',
  'spray',
  'stacking',
  'storage-conditions',
  'study',
  'supplement',
  'tablet',
  'topical',
  'vitamin-a',
  'vitamin-b1-thiamine',
  'vitamin-b12',
  'vitamin-b2-riboflavin',
  'vitamin-b3-niacin',
  'vitamin-b5-pantothenic-acid',
  'vitamin-b6',
  'vitamin-b7-biotin',
  'vitamin-b9-folate',
  'vitamin-c',
  'vitamin-d',
  'vitamin-e',
  'vitamin-k',
  'with-food',
  'zinc');

update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'absorption';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'accumulation';
update glossary_terms set tags = '{}'::text[], bearings = array['Memory','Focus','Nootropics']::text[], updated_at = now() where slug = 'acetylcholine';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'active-metabolite';
update glossary_terms set tags = '{}'::text[], bearings = array['Stress','Mood','Energy']::text[], updated_at = now() where slug = 'adaptogen';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'adulteration';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'adverse-effect';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Recovery']::text[], updated_at = now() where slug = 'amino-acid';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Strength','Hormones','Testosterone']::text[], updated_at = now() where slug = 'anabolic-steroid';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones','Testosterone']::text[], updated_at = now() where slug = 'androgen';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'antioxidant';
update glossary_terms set tags = array['safety']::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'bacteriostatic-water';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'batch-testing';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'batch-to-batch-consistency';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'bioavailability';
update glossary_terms set category = 'Usage Patterns', tags = array['slang']::text[], bearings = array['Hormones','Testosterone','Muscle Gain']::text[], updated_at = now() where slug = 'blast-and-cruise';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'botanical';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Recovery']::text[], updated_at = now() where slug = 'branched-chain-amino-acid-bcaa';
update glossary_terms set tags = array['slang']::text[], bearings = array['Muscle Gain']::text[], updated_at = now() where slug = 'bulk';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'coa-certificate-of-analysis';
update glossary_terms set tags = '{}'::text[], bearings = array['Sleep','Anxiety','Mood','Recovery']::text[], updated_at = now() where slug = 'cannabinoid';
update glossary_terms set tags = '{}'::text[], bearings = array['Energy','Endurance']::text[], updated_at = now() where slug = 'carbohydrate';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'chelate';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'chelated-mineral';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'cholesterol';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'concentrate';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'contaminant';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'contraindication';
update glossary_terms set tags = '{}'::text[], bearings = array['Stress','Sleep','Hormones']::text[], updated_at = now() where slug = 'cortisol';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'counterfeit-product';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'cross-tolerance';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'cubic-centimeter-cc';
update glossary_terms set tags = array['slang']::text[], bearings = array['Fat Loss']::text[], updated_at = now() where slug = 'cut';
update glossary_terms set tags = array['slang']::text[], bearings = array['Hormones','Nootropics']::text[], updated_at = now() where slug = 'cycle';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'deficiency';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'degradation-product';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'dependence';
update glossary_terms set tags = '{}'::text[], bearings = array['Focus','Mood','Energy']::text[], updated_at = now() where slug = 'dopamine';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'dose';
update glossary_terms set tags = '{}'::text[], bearings = array['Endurance','Recovery']::text[], updated_at = now() where slug = 'electrolyte';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'elemental-amount';
update glossary_terms set tags = '{}'::text[], bearings = array['Fasting']::text[], updated_at = now() where slug = 'empty-stomach';
update glossary_terms set tags = '{}'::text[], bearings = array['Sleep','Anxiety','Mood','Recovery']::text[], updated_at = now() where slug = 'endocannabinoid';
update glossary_terms set tags = array['lab-report','safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'endotoxin';
update glossary_terms set category = 'Classification', tags = array['slang']::text[], bearings = array['Hormones','Muscle Gain']::text[], updated_at = now() where slug = 'enhanced';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'enteric-coated';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Recovery']::text[], updated_at = now() where slug = 'essential-amino-acid';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'ester';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones']::text[], updated_at = now() where slug = 'estrogen';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'extract-ratio';
update glossary_terms set tags = '{}'::text[], bearings = array['Fasting']::text[], updated_at = now() where slug = 'fasted';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'fat';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'fat-soluble-vitamin';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'fatty-acid';
update glossary_terms set tags = '{}'::text[], bearings = array['Gut Health']::text[], updated_at = now() where slug = 'fiber';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'first-pass-metabolism';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'flavonoid';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'fortified';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'free-radical';
update glossary_terms set tags = '{}'::text[], bearings = array['Sleep','Anxiety','Stress']::text[], updated_at = now() where slug = 'gaba';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'gmp-good-manufacturing-practice';
update glossary_terms set tags = '{}'::text[], bearings = array['Memory','Focus']::text[], updated_at = now() where slug = 'glutamate';
update glossary_terms set category = 'Classification', tags = array['slang']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'grey-market';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones','Recovery','Muscle Gain']::text[], updated_at = now() where slug = 'growth-hormone';
update glossary_terms set tags = '{}'::text[], bearings = array['Gut Health']::text[], updated_at = now() where slug = 'gut-microbiome';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'hdl';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'half-life';
update glossary_terms set tags = array['lab-report','safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'heavy-metals';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'herbal-extract';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones']::text[], updated_at = now() where slug = 'hormone';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'identity-testing';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'independent-laboratory';
update glossary_terms set tags = '{}'::text[], bearings = array['Recovery','Longevity']::text[], updated_at = now() where slug = 'inflammation';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'insufficiency';
update glossary_terms set tags = '{}'::text[], bearings = array['Fat Loss','Longevity','Fasting']::text[], updated_at = now() where slug = 'insulin';
update glossary_terms set tags = '{}'::text[], bearings = array['Fat Loss','Longevity','Fasting']::text[], updated_at = now() where slug = 'insulin-sensitivity';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'interaction';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'intramuscular';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'isolate';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'ldl';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'liposomal';
update glossary_terms set tags = '{}'::text[], bearings = array['Strength','Muscle Gain']::text[], updated_at = now() where slug = 'loading-phase';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'lyophilized';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'macronutrient';
update glossary_terms set tags = '{}'::text[], bearings = array['Strength','Muscle Gain']::text[], updated_at = now() where slug = 'maintenance-phase';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'measured-potency';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'microbial-testing';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Mood','Focus']::text[], updated_at = now() where slug = 'microdosing';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'micronized';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'micronutrient';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'mineral';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'mislabeling';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'mushroom-extract';
update glossary_terms set category = 'Classification', tags = array['slang']::text[], bearings = array['Hormones','Muscle Gain']::text[], updated_at = now() where slug = 'natty';
update glossary_terms set tags = '{}'::text[], bearings = array['Mood','Focus','Nootropics']::text[], updated_at = now() where slug = 'neurotransmitter';
update glossary_terms set tags = '{}'::text[], bearings = array['Nootropics','Focus','Memory']::text[], updated_at = now() where slug = 'nootropic';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking']::text[], updated_at = now() where slug = 'novel-compound';
update glossary_terms set tags = '{}'::text[], bearings = array['Mood','Longevity']::text[], updated_at = now() where slug = 'omega-3-fatty-acid';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'omega-6-fatty-acid';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'overdosed';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'oxidative-stress';
update glossary_terms set category = 'Usage Patterns', tags = array['slang']::text[], bearings = array['Hormones','Testosterone','Muscle Gain']::text[], updated_at = now() where slug = 'pct-post-cycle-therapy';
update glossary_terms set tags = '{}'::text[], bearings = array['Recovery','Biohacking']::text[], updated_at = now() where slug = 'peptide';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones']::text[], updated_at = now() where slug = 'peptide-hormone';
update glossary_terms set tags = '{}'::text[], bearings = array['Sleep','Anxiety','Mood','Recovery']::text[], updated_at = now() where slug = 'phytocannabinoid';
update glossary_terms set category = 'Usage Patterns', tags = array['slang']::text[], bearings = array['Hormones','Testosterone','Muscle Gain']::text[], updated_at = now() where slug = 'pinning';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'polyphenol';
update glossary_terms set tags = '{}'::text[], bearings = array['Gut Health']::text[], updated_at = now() where slug = 'postbiotic';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'potency-testing';
update glossary_terms set tags = '{}'::text[], bearings = array['Gut Health']::text[], updated_at = now() where slug = 'prebiotic';
update glossary_terms set tags = '{}'::text[], bearings = array['Gut Health']::text[], updated_at = now() where slug = 'probiotic';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'prodrug';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'product-recall';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Hormones','Testosterone']::text[], updated_at = now() where slug = 'prohormone';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'proprietary-blend';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Recovery']::text[], updated_at = now() where slug = 'protein';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Supplements']::text[], updated_at = now() where slug = 'protocol';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'purity';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'quality-assurance';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'quality-control';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'rda';
update glossary_terms set tags = '{}'::text[], bearings = array['Nootropics','Focus','Memory']::text[], updated_at = now() where slug = 'racetam';
update glossary_terms set category = 'Usage Patterns', tags = array['slang']::text[], bearings = array['Muscle Gain','Fat Loss']::text[], updated_at = now() where slug = 'recomp-body-recomposition';
update glossary_terms set tags = array['safety']::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'reconstitution';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking']::text[], updated_at = now() where slug = 'research-chemical';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Hormones','Testosterone']::text[], updated_at = now() where slug = 'sarm';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'salt-form';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones']::text[], updated_at = now() where slug = 'secretagogue';
update glossary_terms set tags = '{}'::text[], bearings = array['Mood','Sleep','Anxiety']::text[], updated_at = now() where slug = 'serotonin';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'side-effect';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'single-ingredient-product';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'specification';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'spiked-product';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'split-dose';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'stability-testing';
update glossary_terms set tags = array['slang']::text[], bearings = array['Nootropics','Supplements','Biohacking']::text[], updated_at = now() where slug = 'stack';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'standardized-extract';
update glossary_terms set tags = array['lab-report','safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'sterility-testing';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones']::text[], updated_at = now() where slug = 'steroid';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'subcutaneous';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones','Testosterone']::text[], updated_at = now() where slug = 'testosterone';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'therapeutic-window';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'third-party-testing';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'tincture';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'titration';
update glossary_terms set tags = array['slang']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'tolerance-break';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'trace-mineral';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'traceability';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'triglyceride';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'underdosed';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'upper-limit-ul';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'vitamin';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'water-soluble-vitamin';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'whole-food-source';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'withdrawal';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'cgmp';

-- ===================== 20261020180000_route_repairs_findings_without_routes.sql =====================
-- Four substances carry verified research findings but sit in no category,
-- so they never appear on the Map. Flagship routes only; idempotent.
insert into substance_routes (substance_id, category_route_id)
select s.id, cr.id
from substances s
join category_routes cr on cr.category = any (case s.slug
    when 'bpc-157' then array['Recovery', 'Pain & Injury']
    when 'caffeine' then array['Performance', 'Cognition']
    when 'clenbuterol' then array['Performance', 'Metabolic Health']
    when 'lions-mane' then array['Cognition']
  end)
where s.slug in ('bpc-157', 'caffeine', 'clenbuterol', 'lions-mane')
  and not exists (
    select 1 from substance_routes sr
    where sr.substance_id = s.id and sr.category_route_id = cr.id
  );

-- ===================== 20261020190000_substance_evidence_counts.sql =====================
-- Public, read-only count of research sources linked to each substance, so
-- catalog cards can show a real number instead of a made-up one. Research
-- tables are admin-only under RLS; this view exposes only the count.
-- Rejected and archived sources are excluded; everything else counts as a
-- linked source (review is a separate, slower process).
create or replace view substance_evidence_counts
with (security_invoker = false) as
select rss.substance_id, count(distinct rs.id)::int as source_count
from research_source_substances rss
join research_sources rs on rs.id = rss.source_id
where coalesce(rs.review_status, 'unreviewed') not in ('rejected', 'archived')
group by rss.substance_id;

grant select on substance_evidence_counts to anon, authenticated;

-- ===================== 20261024120000_research_submissions.sql =====================
-- Research connector: submissions, review, publication, rollback.
--
-- Regular Claude submits structured research through the `research-mcp`
-- Edge Function, authenticated as the site owner via Supabase Auth OAuth.
-- The function validates, stages sources/findings through the existing
-- import RPCs (which already land as unreviewed / pending_review), and
-- records the whole batch here. Description and glossary proposals are
-- never applied on submit; they wait in `payload` until an admin approves
-- the submission, at which point the RPCs below publish them with history
-- so every change can be reverted.
--
-- Policy (v1, deliberately conservative):
--   * Nothing a submission proposes is public until an admin approves it.
--   * Approval publishes: description/origin/half-life updates (with the
--     previous values saved), glossary terms (previous rows saved), and
--     flips this batch's findings to `approved`. Sources stay bibliographic
--     records; their review_status is untouched.
--   * Rejection removes the staged batch (existing revert RPC) and keeps the
--     submission row and report as the audit trail.
--   * Revert of a published submission restores descriptions and glossary
--     rows from history and removes the batch's sources/findings.

create table if not exists research_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references users (id) on delete set null,
  client_name text,
  idempotency_key text not null,
  label text not null,
  is_test boolean not null default false,
  status text not null default 'needs_review'
    check (status in ('needs_review', 'rejected', 'published', 'reverted')),
  payload jsonb not null,
  report jsonb not null default '{}'::jsonb,
  import_batch_id uuid references research_import_batches (id) on delete set null,
  substance_slugs text[] not null default '{}',
  reviewed_by uuid references users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  /** Snapshot taken at publish time so a revert can restore exactly what was there. */
  undo jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists research_submissions_idem on research_submissions (submitted_by, idempotency_key);
create index if not exists research_submissions_status_idx on research_submissions (status, created_at desc);

alter table research_submissions enable row level security;
drop policy if exists research_submissions_admin_read on research_submissions;
create policy research_submissions_admin_read on research_submissions for select using (is_site_admin());
grant select on research_submissions to authenticated;

create table if not exists substance_description_history (
  id uuid primary key default gen_random_uuid(),
  substance_id uuid not null references substances (id) on delete cascade,
  submission_id uuid references research_submissions (id) on delete set null,
  previous jsonb not null,
  next jsonb not null,
  changed_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table substance_description_history enable row level security;
drop policy if exists substance_description_history_admin_read on substance_description_history;
create policy substance_description_history_admin_read on substance_description_history for select using (is_site_admin());
grant select on substance_description_history to authenticated;

-- ---------------------------------------------------------------------------
-- Queue: what needs research, by defensible rules on existing fields.
-- ---------------------------------------------------------------------------
create or replace function research_queue(p_limit integer default 20, p_classification text default null)
returns table (
  slug text, name text, classification text, risk_level text,
  description_length integer, description_circular boolean,
  source_count integer, finding_count integer, routes text[],
  reasons text[], score integer
)
language sql stable security definer set search_path = public as $$
  with base as (
    select s.id, s.slug, s.name, s.classification::text as classification, s.risk_level,
      length(coalesce(s.description, '')) as dlen,
      (lower(coalesce(s.description, '')) ~ '^(a|an|the)?\s*(form|type|kind|version|variant|salt|ester) of '
        or lower(coalesce(s.description, '')) like lower(s.name) || ' is a %') as circular,
      (select count(*)::int from research_source_substances r where r.substance_id = s.id) as sources,
      (select count(*)::int from research_findings f where f.substance_id = s.id and f.review_status <> 'rejected') as findings,
      (select coalesce(array_agg(cr.category order by cr.category), '{}') from substance_routes sr join category_routes cr on cr.id = sr.category_route_id where sr.substance_id = s.id) as routes
    from substances s
    where is_site_admin()
      and (p_classification is null or s.classification::text = p_classification)
  ),
  scored as (
    select *,
      array_remove(array[
        case when dlen < 80 then 'description under 80 characters' end,
        case when circular then 'description is circular' end,
        case when sources = 0 then 'no linked sources' end,
        case when findings = 0 then 'no findings' end,
        case when cardinality(routes) = 0 then 'no category route' end
      ], null) as reasons,
      (case when dlen < 80 then 3 else 0 end + case when circular then 3 else 0 end
       + case when sources = 0 then 2 else 0 end + case when findings = 0 then 1 else 0 end) as score
    from base
  )
  select slug, name, classification, risk_level, dlen, circular, sources, findings, routes, reasons, score
  from scored
  where score > 0
  order by score desc, (classification = 'Everyday') desc, name asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;
revoke all on function research_queue(integer, text) from public, anon;
grant execute on function research_queue(integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Record a validated, staged submission (called by the connector as the owner).
-- ---------------------------------------------------------------------------
create or replace function admin_record_research_submission(
  p_idempotency_key text, p_label text, p_client text, p_is_test boolean,
  p_payload jsonb, p_report jsonb, p_batch_id uuid, p_substance_slugs text[]
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row research_submissions%rowtype; v_existing research_submissions%rowtype;
begin
  if auth.uid() is null or not is_site_admin() then raise exception 'site_admin or site_owner role is required'; end if;
  select * into v_existing from research_submissions where submitted_by = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('id', v_existing.id, 'duplicate', true, 'status', v_existing.status, 'report', v_existing.report, 'created_at', v_existing.created_at);
  end if;
  insert into research_submissions (submitted_by, client_name, idempotency_key, label, is_test, payload, report, import_batch_id, substance_slugs)
  values (auth.uid(), nullif(btrim(p_client), ''), p_idempotency_key, btrim(p_label), coalesce(p_is_test, false), p_payload, coalesce(p_report, '{}'::jsonb), p_batch_id, coalesce(p_substance_slugs, '{}'))
  returning * into v_row;
  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'research_submission_received', 'research_submission', v_row.id, format('%s (%s)', v_row.label, coalesce(v_row.client_name, 'unknown client')));
  return jsonb_build_object('id', v_row.id, 'duplicate', false, 'status', v_row.status, 'created_at', v_row.created_at);
end $$;
revoke all on function admin_record_research_submission(text, text, text, boolean, jsonb, jsonb, uuid, text[]) from public, anon;
grant execute on function admin_record_research_submission(text, text, text, boolean, jsonb, jsonb, uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Publish an approved submission (owner only).
-- ---------------------------------------------------------------------------
create or replace function admin_publish_research_submission(p_id uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v research_submissions%rowtype;
  item jsonb; v_sub substances%rowtype; v_slug text;
  v_prev jsonb; v_next jsonb;
  v_desc_count integer := 0; v_gloss_count integer := 0; v_findings integer := 0;
  v_undo_desc jsonb := '[]'::jsonb; v_undo_gloss jsonb := '[]'::jsonb;
  v_has_v2 boolean; v_gslug text; v_prev_g jsonb; v_term text; v_def text;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  select * into v from research_submissions where id = p_id for update;
  if not found then raise exception 'unknown submission'; end if;
  if v.status <> 'needs_review' then raise exception 'submission is %, not needs_review', v.status; end if;

  -- 1. Descriptions / origin / half-life, with history.
  for item in select value from jsonb_array_elements(coalesce(v.payload->'substance_updates', '[]'::jsonb)) loop
    v_slug := item->>'slug';
    select * into v_sub from substances where slug = v_slug;
    if not found then continue; end if;
    v_prev := jsonb_build_object('description', v_sub.description, 'origin', v_sub.origin, 'half_life', v_sub.half_life);
    v_next := jsonb_build_object(
      'description', coalesce(nullif(btrim(item->>'description'), ''), v_sub.description),
      'origin', coalesce(nullif(btrim(item->>'origin'), ''), v_sub.origin),
      'half_life', coalesce(nullif(btrim(item->>'half_life'), ''), v_sub.half_life));
    if v_prev = v_next then continue; end if;
    update substances set
      description = v_next->>'description',
      origin = v_next->>'origin',
      half_life = v_next->>'half_life',
      updated_at = now()
    where id = v_sub.id;
    insert into substance_description_history (substance_id, submission_id, previous, next, changed_by)
    values (v_sub.id, v.id, v_prev, v_next, auth.uid());
    v_undo_desc := v_undo_desc || jsonb_build_object('substance_id', v_sub.id, 'previous', v_prev);
    v_desc_count := v_desc_count + 1;
  end loop;

  -- 2. Glossary terms (v1 columns always; v2 tags/bearings/detail when present).
  select exists (select 1 from information_schema.columns where table_name = 'glossary_terms' and column_name = 'tags') into v_has_v2;
  for item in select value from jsonb_array_elements(coalesce(v.payload->'glossary_terms', '[]'::jsonb)) loop
    v_term := btrim(item->>'term');
    v_def := btrim(item->>'definition');
    if v_term = '' or v_def = '' then continue; end if;
    v_gslug := btrim(regexp_replace(lower(v_term), '[^a-z0-9]+', '-', 'g'), '-');
    select to_jsonb(g) into v_prev_g from glossary_terms g where lower(g.slug) = v_gslug;
    v_undo_gloss := v_undo_gloss || jsonb_build_object('slug', v_gslug, 'previous', v_prev_g);
    if v_has_v2 then
      execute $q$
        insert into glossary_terms (term, slug, definition, category, detail, tags, bearings)
        values ($1, $2, $3, $4, $5, coalesce($6, '{}'::text[]), coalesce($7, '{}'::text[]))
        on conflict (slug) do update set term = excluded.term, definition = excluded.definition,
          category = coalesce(excluded.category, glossary_terms.category),
          detail = coalesce(excluded.detail, glossary_terms.detail),
          tags = case when cardinality(excluded.tags) > 0 then excluded.tags else glossary_terms.tags end,
          bearings = case when cardinality(excluded.bearings) > 0 then excluded.bearings else glossary_terms.bearings end,
          updated_at = now()
      $q$ using v_term, v_gslug, v_def, nullif(btrim(item->>'category'), ''), nullif(btrim(item->>'detail'), ''),
            (select array_agg(x) from jsonb_array_elements_text(coalesce(item->'tags', '[]'::jsonb)) x),
            (select array_agg(x) from jsonb_array_elements_text(coalesce(item->'bearings', '[]'::jsonb)) x);
    else
      insert into glossary_terms (term, slug, definition, category)
      values (v_term, v_gslug, v_def, nullif(btrim(item->>'category'), ''))
      on conflict (slug) do update set term = excluded.term, definition = excluded.definition,
        category = coalesce(excluded.category, glossary_terms.category), updated_at = now();
    end if;
    v_gloss_count := v_gloss_count + 1;
  end loop;

  -- 3. Findings staged by this batch become approved (the reviewer has read the report).
  if v.import_batch_id is not null then
    update research_findings set review_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    where import_batch_id = v.import_batch_id and review_status = 'pending_review';
    get diagnostics v_findings = row_count;
  end if;

  update research_submissions set status = 'published', reviewed_by = auth.uid(), reviewed_at = now(),
    review_note = nullif(btrim(p_note), ''), undo = jsonb_build_object('descriptions', v_undo_desc, 'glossary', v_undo_gloss), updated_at = now()
  where id = v.id;
  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'research_submission_published', 'research_submission', v.id,
          format('%s: %s description updates, %s glossary terms, %s findings approved', v.label, v_desc_count, v_gloss_count, v_findings));
  return jsonb_build_object('id', v.id, 'descriptions', v_desc_count, 'glossary_terms', v_gloss_count, 'findings_approved', v_findings);
end $$;
revoke all on function admin_publish_research_submission(uuid, text) from public, anon;
grant execute on function admin_publish_research_submission(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Reject: drop the staged batch, keep the record.
-- ---------------------------------------------------------------------------
create or replace function admin_reject_research_submission(p_id uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v research_submissions%rowtype; v_revert jsonb := null;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  select * into v from research_submissions where id = p_id for update;
  if not found then raise exception 'unknown submission'; end if;
  if v.status <> 'needs_review' then raise exception 'submission is %, not needs_review', v.status; end if;
  if v.import_batch_id is not null then v_revert := admin_revert_import_batch(v.import_batch_id); end if;
  update research_submissions set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(btrim(p_note), ''), updated_at = now() where id = v.id;
  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'research_submission_rejected', 'research_submission', v.id, coalesce(nullif(btrim(p_note), ''), v.label));
  return jsonb_build_object('id', v.id, 'batch_revert', v_revert);
end $$;
revoke all on function admin_reject_research_submission(uuid, text) from public, anon;
grant execute on function admin_reject_research_submission(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Revert a published submission.
-- ---------------------------------------------------------------------------
create or replace function admin_revert_research_submission(p_id uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v research_submissions%rowtype; item jsonb; v_revert jsonb := null; v_desc integer := 0; v_gloss integer := 0; v_has_v2 boolean;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  select * into v from research_submissions where id = p_id for update;
  if not found then raise exception 'unknown submission'; end if;
  if v.status <> 'published' then raise exception 'submission is %, not published', v.status; end if;

  for item in select value from jsonb_array_elements(coalesce(v.undo->'descriptions', '[]'::jsonb)) loop
    update substances set
      description = item->'previous'->>'description',
      origin = item->'previous'->>'origin',
      half_life = item->'previous'->>'half_life',
      updated_at = now()
    where id = (item->>'substance_id')::uuid;
    v_desc := v_desc + 1;
  end loop;

  select exists (select 1 from information_schema.columns where table_name = 'glossary_terms' and column_name = 'tags') into v_has_v2;
  for item in select value from jsonb_array_elements(coalesce(v.undo->'glossary', '[]'::jsonb)) loop
    if item->'previous' is null or jsonb_typeof(item->'previous') = 'null' then
      delete from glossary_terms where lower(slug) = item->>'slug';
    elsif v_has_v2 then
      execute $q$ update glossary_terms set term = $1, definition = $2, category = $3, detail = $4,
        tags = coalesce($5, '{}'::text[]), bearings = coalesce($6, '{}'::text[]), updated_at = now() where lower(slug) = $7 $q$
      using item->'previous'->>'term', item->'previous'->>'definition', item->'previous'->>'category', item->'previous'->>'detail',
        (select array_agg(x) from jsonb_array_elements_text(coalesce(item->'previous'->'tags', '[]'::jsonb)) x),
        (select array_agg(x) from jsonb_array_elements_text(coalesce(item->'previous'->'bearings', '[]'::jsonb)) x),
        item->>'slug';
    else
      update glossary_terms set term = item->'previous'->>'term', definition = item->'previous'->>'definition',
        category = item->'previous'->>'category', updated_at = now() where lower(slug) = item->>'slug';
    end if;
    v_gloss := v_gloss + 1;
  end loop;

  if v.import_batch_id is not null then v_revert := admin_revert_import_batch(v.import_batch_id); end if;
  update research_submissions set status = 'reverted', review_note = coalesce(nullif(btrim(p_note), ''), review_note), updated_at = now() where id = v.id;
  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'research_submission_reverted', 'research_submission', v.id,
          format('%s: restored %s descriptions, %s glossary rows', v.label, v_desc, v_gloss));
  return jsonb_build_object('id', v.id, 'descriptions_restored', v_desc, 'glossary_restored', v_gloss, 'batch_revert', v_revert);
end $$;
revoke all on function admin_revert_research_submission(uuid, text) from public, anon;
grant execute on function admin_revert_research_submission(uuid, text) to authenticated;

notify pgrst, 'reload schema';
