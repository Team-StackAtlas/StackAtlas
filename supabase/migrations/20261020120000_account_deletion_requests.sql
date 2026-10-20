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
