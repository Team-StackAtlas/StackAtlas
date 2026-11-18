-- The rate-limit helper and its trigger functions are internal: triggers fire
-- them as the table owner, so no API role needs EXECUTE. Exposing them let
-- anyone probe whether an account id has a confirmed email (flagged by the
-- Supabase security advisor after 20261020123000 was applied).
revoke all on function assert_account_may_contribute(uuid, boolean) from public, anon, authenticated;
revoke all on function enforce_post_rate_limit() from public, anon, authenticated;
revoke all on function enforce_comment_rate_limit() from public, anon, authenticated;
revoke all on function enforce_rating_rate_limit() from public, anon, authenticated;
