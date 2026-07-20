-- Fix profile_stats counting soft-deleted posts.
--
-- profile_stats powers the follower/following/dispatch/signal counts shown on
-- every profile page. The post-count subqueries didn't filter deleted_at, so a
-- profile's dispatch/signal totals included posts the author had deleted (which
-- are hidden everywhere else by the posts_public_read RLS `deleted_at is null`
-- clause). Add the same filter here.
--
-- This view stays SECURITY DEFINER (the default; security_invoker is NOT set) on
-- purpose. `follows` has no public-read policy -- a user can only read follow
-- rows where they are the follower (follows_owner: auth.uid() = follower_id).
-- A security_invoker view would therefore return 0 for followers_count and for
-- anyone else's following_count. Definer context lets the view expose only the
-- aggregate counts without exposing who-follows-whom, which is the intended
-- design. The advisor's security_definer_view lint on this view is an accepted
-- trade-off, not an oversight.

create or replace view profile_stats as
select
  p.id,
  (select count(*) from follows f
     where f.target_type = 'user'::follow_target and f.target_id = p.id::text) as followers_count,
  (select count(*) from follows f
     where f.follower_id = p.id) as following_count,
  (select count(*) from posts po
     where po.author_id = p.id and po.kind = 'dispatch'::post_kind and po.deleted_at is null) as dispatch_count,
  (select count(*) from posts po
     where po.author_id = p.id and po.kind = 'signal'::post_kind and po.deleted_at is null) as signal_count
from profiles p;

comment on view profile_stats is
  'Aggregate profile counts. Intentionally SECURITY DEFINER (no security_invoker) so it can count follows rows that the querying user cannot read individually; exposes only counts, never the underlying follow/post rows.';

notify pgrst, 'reload schema';
