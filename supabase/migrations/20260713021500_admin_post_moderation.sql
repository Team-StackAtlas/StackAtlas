-- Admin soft delete / restore for community posts, audit-logged.
--
-- posts.deleted_at already hides content from the public feed (RLS from the
-- posts persistence migration); this adds the audited admin path to set and
-- clear it, powering the Admin -> Deleted tab.

create or replace function admin_moderate_post(p_post_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_title text; v_deleted timestamptz;
begin
  if auth.uid() is null or not is_site_admin() then
    raise exception 'site_admin or site_owner role is required';
  end if;
  if p_action not in ('soft_delete', 'restore') then
    raise exception 'invalid action: %', coalesce(p_action, '(missing)');
  end if;

  select title, deleted_at into v_title, v_deleted from posts where id = p_post_id;
  if v_title is null then raise exception 'unknown post'; end if;

  update posts
  set deleted_at = case when p_action = 'soft_delete' then now() else null end,
      updated_at = now()
  where id = p_post_id;

  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(),
          case when p_action = 'soft_delete' then 'post_soft_deleted' else 'post_restored' end,
          'post', p_post_id, v_title);

  return jsonb_build_object('id', p_post_id, 'action', p_action);
end $$;

revoke all on function admin_moderate_post(uuid, text) from public, anon, authenticated;
grant execute on function admin_moderate_post(uuid, text) to authenticated;

notify pgrst, 'reload schema';
