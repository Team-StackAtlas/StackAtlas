-- Followers / following lists.
--
-- `follows` RLS lets a user read only their own rows, so a profile's
-- followers list needs a SECURITY DEFINER reader that enforces the owner's
-- visibility choice: the list is private unless the owner turned on
-- showFollowersList / showFollowingList (counts stay on follower_counts).
-- A private account's list is additionally limited to approved followers.
-- Avatars respect the listed user's own showAvatar toggle.

create or replace function list_user_followers(p_user_id uuid)
returns table (user_id uuid, username text, display_name text, avatar_url text, followed_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_settings jsonb;
begin
  select settings into v_settings from profiles where id = p_user_id and deleted_at is null;
  if v_settings is null then return; end if;
  if auth.uid() is distinct from p_user_id then
    if coalesce((v_settings->>'showFollowersList')::boolean, false) is not true then
      raise exception 'followers_list_private';
    end if;
    if v_settings->>'accountPrivacy' = 'private' and not exists (
      select 1 from follows f where f.follower_id = auth.uid() and f.target_type = 'user' and f.target_id = p_user_id::text
    ) then
      raise exception 'account_private';
    end if;
  end if;
  return query
    select p.id, p.username, p.display_name,
           case when coalesce((p.settings->>'showAvatar')::boolean, false) then p.avatar_url end,
           f.created_at
    from follows f
    join profiles p on p.id = f.follower_id
    where f.target_type = 'user' and f.target_id = p_user_id::text and p.deleted_at is null
    order by f.created_at desc;
end $$;

create or replace function list_user_following(p_user_id uuid)
returns table (user_id uuid, username text, display_name text, avatar_url text, followed_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_settings jsonb;
begin
  select settings into v_settings from profiles where id = p_user_id and deleted_at is null;
  if v_settings is null then return; end if;
  if auth.uid() is distinct from p_user_id then
    if coalesce((v_settings->>'showFollowingList')::boolean, false) is not true then
      raise exception 'following_list_private';
    end if;
    if v_settings->>'accountPrivacy' = 'private' and not exists (
      select 1 from follows f where f.follower_id = auth.uid() and f.target_type = 'user' and f.target_id = p_user_id::text
    ) then
      raise exception 'account_private';
    end if;
  end if;
  return query
    select p.id, p.username, p.display_name,
           case when coalesce((p.settings->>'showAvatar')::boolean, false) then p.avatar_url end,
           f.created_at
    from follows f
    join profiles p on p.id::text = f.target_id
    where f.follower_id = p_user_id and f.target_type = 'user' and p.deleted_at is null
    order by f.created_at desc;
end $$;

revoke all on function list_user_followers(uuid) from public;
revoke all on function list_user_following(uuid) from public;
grant execute on function list_user_followers(uuid) to anon, authenticated;
grant execute on function list_user_following(uuid) to anon, authenticated;
