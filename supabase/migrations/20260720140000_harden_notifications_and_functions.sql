-- Security hardening from the Supabase advisor pass.
--
-- 1) create_notification was SECURITY DEFINER, EXECUTE granted to PUBLIC
--    (so anon could call it), and trusted the caller-supplied p_actor_id.
--    That let anyone forge notifications from any user with arbitrary
--    title/body/link (a phishing vector). It is only ever called from the
--    client, always with the current user as actor, so force actor_id =
--    auth.uid(), require an authenticated caller, and restrict EXECUTE.
-- 2) import_slugify had a mutable search_path -- pin it.
-- 3) Trigger functions were EXECUTE-able via RPC by anon/authenticated;
--    they only ever run as triggers (as the table owner, independent of
--    grants), so revoke their RPC executability.

create or replace function create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_kind text,
  p_category text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_target_type text default null,
  p_target_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_actor uuid := auth.uid();
  v_enabled boolean;
begin
  -- Authenticated callers only; the actor is always the caller (the passed
  -- p_actor_id is ignored so it cannot be spoofed).
  if v_actor is null then
    return null;
  end if;
  if p_recipient_id is null or p_recipient_id = v_actor then
    return null;
  end if;

  select case p_category
    when 'likes' then likes
    when 'comments' then comments
    when 'follows' then follows
    when 'mentions' then mentions
    when 'albums' then albums
    else true
  end into v_enabled
  from notification_settings
  where user_id = p_recipient_id;

  if coalesce(v_enabled, true) = false then
    return null;
  end if;

  insert into notifications (user_id, recipient_id, actor_id, kind, category, title, body, link, target_type, target_id, metadata)
  values (p_recipient_id, p_recipient_id, v_actor, p_kind, p_category, p_title, p_body, p_link, p_target_type, p_target_id, p_metadata)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function create_notification(uuid, uuid, text, text, text, text, text, text, text, jsonb) from public, anon;
grant execute on function create_notification(uuid, uuid, text, text, text, text, text, text, text, jsonb) to authenticated;

alter function import_slugify(text) set search_path = public;

revoke all on function handle_new_user() from public, anon, authenticated;
revoke all on function notify_on_post_comment() from public, anon, authenticated;
revoke all on function protect_profile_admin_fields() from public, anon, authenticated;
revoke all on function rls_auto_enable() from public, anon, authenticated;

notify pgrst, 'reload schema';
