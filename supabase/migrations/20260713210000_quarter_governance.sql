-- Phase 3 comms Quarter governance: in-quarter owner/moderator controls for
-- PERSISTED quarters (promote/demote a member, remove a member, soft-delete/
-- restore a message), distinct from the SITE-admin RPCs added in
-- 20260713200000_quarters_admin_controls.sql (admin_moderate_quarter_message/
-- admin_remove_quarter_member), which remain for site admins acting outside
-- their own quarters and keep writing to moderation_log. In-quarter
-- governance below is NOT site moderation, so it writes no moderation_log
-- entries.
--
-- None of quarter_members/quarter_messages have an UPDATE policy for
-- ordinary members (only member_read/member_insert), so role changes,
-- removal, and message moderation all go through SECURITY DEFINER RPCs that
-- check the caller's role in-body, mirroring the site-admin RPCs' style.
--
-- Permission matrix:
--   quarter_set_member_role: caller must be the quarter_owner; promotes a
--     member to quarter_moderator or demotes a moderator to quarter_member;
--     cannot target the owner or themselves.
--   quarter_remove_member: caller must be owner or moderator; owner may
--     remove any non-owner, non-self member (including moderators);
--     moderator may only remove a plain quarter_member (not another
--     moderator, not the owner); nobody can remove the owner or themselves
--     (self-removal goes through leave_quarter).
--   quarter_moderate_message: caller must be owner or moderator of the
--     message's quarter; soft_delete/restore, no reason field.

create or replace function quarter_set_member_role(p_quarter_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller_role text;
  v_target_role text;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  if p_role not in ('quarter_moderator', 'quarter_member') then
    raise exception 'invalid role: %', coalesce(p_role, '(missing)');
  end if;
  if p_user_id = auth.uid() then
    raise exception 'owner cannot change their own role';
  end if;

  select role into v_caller_role
  from quarter_members
  where quarter_id = p_quarter_id and user_id = auth.uid() and removed_at is null;

  if v_caller_role is distinct from 'quarter_owner' then
    raise exception 'only the quarter owner can change member roles';
  end if;

  select role into v_target_role
  from quarter_members
  where quarter_id = p_quarter_id and user_id = p_user_id and removed_at is null;

  if v_target_role is null then
    raise exception 'not an active member of this quarter';
  end if;
  if v_target_role = 'quarter_owner' then
    raise exception 'cannot change the owner''s role';
  end if;
  if v_target_role = p_role then
    raise exception 'member already has that role';
  end if;

  update quarter_members set role = p_role
  where quarter_id = p_quarter_id and user_id = p_user_id;
end;
$$;

revoke all on function quarter_set_member_role(uuid, uuid, text) from public, anon;
grant execute on function quarter_set_member_role(uuid, uuid, text) to authenticated;

create or replace function quarter_remove_member(p_quarter_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller_role text;
  v_target_role text;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'use leave_quarter to remove yourself';
  end if;

  select role into v_caller_role
  from quarter_members
  where quarter_id = p_quarter_id and user_id = auth.uid() and removed_at is null;

  if v_caller_role not in ('quarter_owner', 'quarter_moderator') then
    raise exception 'only the quarter owner or a moderator can remove members';
  end if;

  select role into v_target_role
  from quarter_members
  where quarter_id = p_quarter_id and user_id = p_user_id and removed_at is null;

  if v_target_role is null then
    raise exception 'not an active member of this quarter';
  end if;
  if v_target_role = 'quarter_owner' then
    raise exception 'cannot remove the quarter owner';
  end if;
  if v_caller_role = 'quarter_moderator' and v_target_role <> 'quarter_member' then
    raise exception 'moderators can only remove plain members';
  end if;

  update quarter_members set removed_at = now()
  where quarter_id = p_quarter_id and user_id = p_user_id;
end;
$$;

revoke all on function quarter_remove_member(uuid, uuid) from public, anon;
grant execute on function quarter_remove_member(uuid, uuid) to authenticated;

create or replace function quarter_moderate_message(p_message_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_quarter_id uuid;
  v_caller_role text;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  if p_action not in ('soft_delete', 'restore') then
    raise exception 'invalid action: %', coalesce(p_action, '(missing)');
  end if;

  select quarter_id into v_quarter_id from quarter_messages where id = p_message_id;
  if v_quarter_id is null then
    raise exception 'unknown quarter message';
  end if;

  select role into v_caller_role
  from quarter_members
  where quarter_id = v_quarter_id and user_id = auth.uid() and removed_at is null;

  if v_caller_role not in ('quarter_owner', 'quarter_moderator') then
    raise exception 'only the quarter owner or a moderator can moderate messages';
  end if;

  update quarter_messages
  set deleted_at = case when p_action = 'soft_delete' then now() else null end,
      deleted_by = case when p_action = 'soft_delete' then auth.uid() else null end
  where id = p_message_id;
end;
$$;

revoke all on function quarter_moderate_message(uuid, text) from public, anon;
grant execute on function quarter_moderate_message(uuid, text) to authenticated;

notify pgrst, 'reload schema';
