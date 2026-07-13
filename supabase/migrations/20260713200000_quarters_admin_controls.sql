-- Site-admin moderation controls for Quarters (Admin -> Quarters tab).
--
-- Phases 1-2 (0009_comms.sql, 0011_admin_review_quarter_controls.sql,
-- 20260713190000_comms_quarters_persistence.sql) made Quarters fully
-- persisted with member-scoped RLS, but gave site admins no way to see or
-- moderate a quarter they don't belong to. This adds:
--   1. Site-admin SELECT policies on quarters/quarter_members/
--      quarter_messages (is_site_admin()), so the Admin -> Quarters tab can
--      list and inspect every quarter, not just ones the admin is a member
--      of.
--   2. admin_moderate_quarter_message(p_message_id, p_action, p_reason):
--      soft-delete or restore a quarter message, audit-logged.
--   3. admin_remove_quarter_member(p_quarter_id, p_user_id): remove a
--      non-owner member from a quarter, audit-logged. Refuses to remove the
--      quarter owner.
-- conversations/messages (private DMs) are untouched by this migration --
-- no admin policy is added there, so DM bodies stay invisible to admins.

create policy quarters_site_admin_read on quarters for select using (is_site_admin());
create policy quarter_members_site_admin_read on quarter_members for select using (is_site_admin());
create policy quarter_messages_site_admin_read on quarter_messages for select using (is_site_admin());

create or replace function admin_moderate_quarter_message(p_message_id uuid, p_action text, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_quarter_id uuid;
begin
  if auth.uid() is null or not is_site_admin() then
    raise exception 'site_admin or site_owner role is required';
  end if;
  if p_action not in ('soft_delete', 'restore') then
    raise exception 'invalid action: %', coalesce(p_action, '(missing)');
  end if;

  select quarter_id into v_quarter_id from quarter_messages where id = p_message_id;
  if v_quarter_id is null then
    raise exception 'unknown quarter message';
  end if;

  update quarter_messages
  set deleted_at = case when p_action = 'soft_delete' then now() else null end,
      deleted_by = case when p_action = 'soft_delete' then auth.uid() else null end,
      deletion_reason = case when p_action = 'soft_delete' then p_reason else null end
  where id = p_message_id;

  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(),
          case when p_action = 'soft_delete' then 'soft_delete_quarter_message' else 'restore_quarter_message' end,
          'quarter_message', p_message_id, p_reason);

  return jsonb_build_object('id', p_message_id, 'action', p_action);
end;
$$;

revoke all on function admin_moderate_quarter_message(uuid, text, text) from public, anon;
grant execute on function admin_moderate_quarter_message(uuid, text, text) to authenticated;

create or replace function admin_remove_quarter_member(p_quarter_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text;
begin
  if auth.uid() is null or not is_site_admin() then
    raise exception 'site_admin or site_owner role is required';
  end if;

  select role into v_role
  from quarter_members
  where quarter_id = p_quarter_id and user_id = p_user_id and removed_at is null;

  if v_role is null then
    raise exception 'not an active member of this quarter';
  end if;
  if v_role = 'quarter_owner' then
    raise exception 'cannot remove the quarter owner';
  end if;

  update quarter_members set removed_at = now()
  where quarter_id = p_quarter_id and user_id = p_user_id;

  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'remove_quarter_member', 'quarter_member', p_user_id, 'quarter:' || p_quarter_id);
end;
$$;

revoke all on function admin_remove_quarter_member(uuid, uuid) from public, anon;
grant execute on function admin_remove_quarter_member(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
