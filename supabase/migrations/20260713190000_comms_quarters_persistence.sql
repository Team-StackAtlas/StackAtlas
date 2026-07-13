-- Phase 2 comms Quarter persistence: RPCs for the operations the 0009/0011
-- Quarter RLS policies do not cover via direct table access, plus the one
-- read policy those phases are missing.
--
-- Direct reads/writes still go straight to the 0009 tables under their
-- existing policies + grants: listing my quarters/members
-- (quarters_member_read, quarter_members_member_read), listing pending
-- invites addressed to or sent by me (quarter_invites_visible), and sending
-- a quarter message as an active member (quarter_messages_member_read/
-- insert). Five operations have no covering policy and go through
-- SECURITY DEFINER RPCs instead:
--   1. Creating a quarter + the owner's membership row atomically (there is
--      no insert policy on quarter_members).
--   2. Inviting a member by username (no insert policy on quarter_invites;
--      also resolves the username to a user id and dedupes against an
--      existing member/pending invite).
--   3. Accept/decline semantics on an invite, which on accept also inserts
--      (or revives) the membership row (no update policy on
--      quarter_invites, no insert policy on quarter_members).
--   4. Leaving a quarter as a non-owner member (no update policy on
--      quarter_members; soft-deletes via removed_at to match the existing
--      "removed_at is null" read/insert policies).
--   5. Marking a quarter read via quarter_members.last_read_at (no update
--      policy on quarter_members).
--
-- Also adds quarters_invitee_read: quarters_member_read only lets members
-- see a quarter row, but an invitee needs to see the quarter's title while
-- their invite is pending (to render "You're invited to <title>").

create policy quarters_invitee_read on quarters for select using (
  exists (
    select 1 from quarter_invites qi
    where qi.quarter_id = id and qi.invitee_id = auth.uid() and qi.status = 'pending'
  )
);

create or replace function create_quarter(p_title text, p_description text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;

  insert into quarters (owner_id, title, description)
  values (auth.uid(), p_title, nullif(p_description, ''))
  returning id into v_id;

  insert into quarter_members (quarter_id, user_id, role)
  values (v_id, auth.uid(), 'quarter_owner');

  return v_id;
end;
$$;

revoke all on function create_quarter(text, text) from public, anon;
grant execute on function create_quarter(text, text) to authenticated;

create or replace function invite_to_quarter(p_quarter_id uuid, p_username text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_invitee_id uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  if not exists (
    select 1 from quarter_members qm
    where qm.quarter_id = p_quarter_id and qm.user_id = auth.uid() and qm.removed_at is null
  ) then
    raise exception 'not a member of this quarter';
  end if;

  select id into v_invitee_id from profiles where lower(username) = lower(trim(p_username));
  if v_invitee_id is null then
    raise exception 'user not found';
  end if;
  if v_invitee_id = auth.uid() then
    raise exception 'cannot invite yourself';
  end if;
  if exists (
    select 1 from quarter_members qm
    where qm.quarter_id = p_quarter_id and qm.user_id = v_invitee_id and qm.removed_at is null
  ) then
    raise exception 'user is already a member';
  end if;

  insert into quarter_invites (quarter_id, inviter_id, invitee_id, status)
  values (p_quarter_id, auth.uid(), v_invitee_id, 'pending')
  on conflict (quarter_id, invitee_id)
  do update set inviter_id = excluded.inviter_id, status = 'pending', responded_at = null
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function invite_to_quarter(uuid, text) from public, anon;
grant execute on function invite_to_quarter(uuid, text) to authenticated;

create or replace function respond_to_quarter_invite(p_invite_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_quarter_id uuid;
  v_invitee_id uuid;
  v_status quarter_invite_status;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;

  select quarter_id, invitee_id, status into v_quarter_id, v_invitee_id, v_status
  from quarter_invites
  where id = p_invite_id
  for update;

  if v_quarter_id is null then
    raise exception 'invite not found';
  end if;
  if v_invitee_id <> auth.uid() then
    raise exception 'not the invitee';
  end if;
  if v_status <> 'pending' then
    raise exception 'invite already resolved';
  end if;

  if p_accept then
    insert into quarter_members (quarter_id, user_id, role)
    values (v_quarter_id, auth.uid(), 'quarter_member')
    on conflict (quarter_id, user_id) do update set removed_at = null;
    update quarter_invites set status = 'accepted', responded_at = now() where id = p_invite_id;
  else
    update quarter_invites set status = 'declined', responded_at = now() where id = p_invite_id;
  end if;
end;
$$;

revoke all on function respond_to_quarter_invite(uuid, boolean) from public, anon;
grant execute on function respond_to_quarter_invite(uuid, boolean) to authenticated;

create or replace function leave_quarter(p_quarter_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;

  select role into v_role
  from quarter_members
  where quarter_id = p_quarter_id and user_id = auth.uid() and removed_at is null;

  if v_role is null then
    raise exception 'not a member of this quarter';
  end if;
  if v_role = 'quarter_owner' then
    raise exception 'owner cannot leave the quarter';
  end if;

  update quarter_members set removed_at = now()
  where quarter_id = p_quarter_id and user_id = auth.uid();
end;
$$;

revoke all on function leave_quarter(uuid) from public, anon;
grant execute on function leave_quarter(uuid) to authenticated;

create or replace function mark_quarter_read(p_quarter_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  update quarter_members
  set last_read_at = now()
  where quarter_id = p_quarter_id and user_id = auth.uid() and removed_at is null;
end;
$$;

revoke all on function mark_quarter_read(uuid) from public, anon;
grant execute on function mark_quarter_read(uuid) to authenticated;

notify pgrst, 'reload schema';
