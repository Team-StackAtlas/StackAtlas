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
