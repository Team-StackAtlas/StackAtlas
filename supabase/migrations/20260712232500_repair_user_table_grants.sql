-- Repair missing table grants behind the long-standing 42501 errors
-- ("permission denied for table follows").
--
-- Six user-action tables have correct owner-scoped RLS policies but were
-- never granted DML privileges to the authenticated role, so every follow,
-- save, hide, vote, and star rating fails in production. RLS still scopes
-- all access; these grants only make the policies reachable.

grant select, insert, update, delete on
  follows,
  follow_requests,
  saved_items,
  hidden_items,
  post_votes,
  brand_star_ratings
to authenticated;

-- Public read is the declared policy for vote counts and brand ratings.
grant select on post_votes, brand_star_ratings to anon;

-- Recipients manage their own notifications (insert stays RPC-only via
-- create_notification).
grant delete on notifications to authenticated;

notify pgrst, 'reload schema';
