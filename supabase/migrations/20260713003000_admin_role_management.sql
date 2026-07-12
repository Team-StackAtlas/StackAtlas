-- Owner-only role management, enforced in the database and audit-logged.
--
-- Before this, site_role changes were a direct client-side profiles.update,
-- and the 0011 admin update policy meant any site_admin could change any
-- profile's site_role through the API (self-promotion included). The UI only
-- hid the buttons.

-- ---------------------------------------------------------------------------
-- 1. Guard trigger: role fields can only change through a site_owner session.
--    Maintenance sessions (no auth.uid(): migrations, service role) stay free.
-- ---------------------------------------------------------------------------

create or replace function protect_profile_admin_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.site_role is distinct from old.site_role
     and auth.uid() is not null and not is_site_owner() then
    raise exception 'only the site owner can change roles';
  end if;
  if old.site_role = 'site_owner'
     and new.account_status is distinct from old.account_status
     and auth.uid() is not null and not is_site_owner() then
    raise exception 'the site owner account status cannot be changed by admins';
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_admin_fields on profiles;
create trigger protect_profile_admin_fields
  before update on profiles
  for each row execute function protect_profile_admin_fields();

-- ---------------------------------------------------------------------------
-- 2. Audited RPCs the admin UI calls instead of direct updates.
-- ---------------------------------------------------------------------------

create or replace function admin_set_site_role(p_user_id uuid, p_role text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_prev text; v_username text;
begin
  if auth.uid() is null or not is_site_owner() then
    raise exception 'site_owner role is required';
  end if;
  if p_role not in ('user', 'site_admin') then
    raise exception 'invalid role: %', coalesce(p_role, '(missing)');
  end if;
  if p_user_id = auth.uid() then
    raise exception 'the site owner cannot change their own role';
  end if;

  select site_role, username into v_prev, v_username from profiles where id = p_user_id;
  if v_prev is null then raise exception 'unknown user'; end if;
  if v_prev = 'site_owner' then raise exception 'site_owner roles cannot be changed here'; end if;

  update profiles set site_role = p_role where id = p_user_id;

  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'site_role_change', 'user', p_user_id,
          format('@%s: %s -> %s', coalesce(v_username, '?'), v_prev, p_role));

  return jsonb_build_object('id', p_user_id, 'site_role', p_role, 'previous_role', v_prev);
end $$;

create or replace function admin_set_account_status(p_user_id uuid, p_status text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_prev text; v_role text; v_username text;
begin
  if auth.uid() is null or not is_site_admin() then
    raise exception 'site_admin or site_owner role is required';
  end if;
  if p_status not in ('active', 'warned', 'suspended', 'banned') then
    raise exception 'invalid status: %', coalesce(p_status, '(missing)');
  end if;

  select account_status, site_role, username into v_prev, v_role, v_username
  from profiles where id = p_user_id;
  if v_prev is null then raise exception 'unknown user'; end if;
  if v_role = 'site_owner' and not is_site_owner() then
    raise exception 'the site owner account status cannot be changed by admins';
  end if;

  update profiles set account_status = p_status where id = p_user_id;

  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'account_status_change', 'user', p_user_id,
          format('@%s: %s -> %s%s', coalesce(v_username, '?'), v_prev, p_status,
                 case when p_note is null then '' else ' — ' || p_note end));

  return jsonb_build_object('id', p_user_id, 'account_status', p_status, 'previous_status', v_prev);
end $$;

revoke all on function admin_set_site_role(uuid, text) from public, anon, authenticated;
revoke all on function admin_set_account_status(uuid, text, text) from public, anon, authenticated;
grant execute on function admin_set_site_role(uuid, text) to authenticated;
grant execute on function admin_set_account_status(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
