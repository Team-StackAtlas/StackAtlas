-- Phase 1 comms DM persistence: RPCs for the operations the 0009 comms RLS
-- policies do not cover via direct table access.
--
-- Direct reads/writes still go straight to the 0009 tables under their
-- existing policies + grants: listing conversations/participants/messages
-- (conversations_member_read, conversation_participants_member_read,
-- messages_member_read), searching profiles (profiles_read, public), and
-- sending a message into an already-accepted conversation
-- (messages_member_insert). Three operations have no covering policy and
-- go through SECURITY DEFINER RPCs instead:
--   1. Creating a conversation + both participant rows atomically (there
--      is no insert policy on conversations or conversation_participants).
--   2. Accept/decline semantics on a request (no update policy on
--      conversations).
--   3. Marking a conversation read via conversation_participants.last_read_at
--      (no update policy on conversation_participants).

create or replace function create_dm_request(p_target_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  if p_target_user_id is null or p_target_user_id = auth.uid() then
    raise exception 'invalid target user';
  end if;
  if not exists (select 1 from profiles where id = p_target_user_id) then
    raise exception 'user not found';
  end if;

  -- Reuse an existing DM between these two users instead of duplicating it.
  select cp1.conversation_id into v_id
  from conversation_participants cp1
  join conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
  where cp1.user_id = auth.uid() and cp2.user_id = p_target_user_id
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into conversations (created_by, status, requested_by)
  values (auth.uid(), 'requested', auth.uid())
  returning id into v_id;

  insert into conversation_participants (conversation_id, user_id)
  values (v_id, auth.uid()), (v_id, p_target_user_id);

  return v_id;
end;
$$;

revoke all on function create_dm_request(uuid) from public, anon;
grant execute on function create_dm_request(uuid) to authenticated;

create or replace function respond_to_conversation_request(p_conversation_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_status comms_conversation_status;
  v_requested_by uuid;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;

  select status, requested_by into v_status, v_requested_by
  from conversations
  where id = p_conversation_id
  for update;

  if v_status is null then
    raise exception 'conversation not found';
  end if;
  if not exists (
    select 1 from conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid()
  ) then
    raise exception 'not a participant';
  end if;
  if v_status <> 'requested' then
    raise exception 'request already resolved';
  end if;
  if v_requested_by = auth.uid() then
    raise exception 'requester cannot respond to their own request';
  end if;

  if p_accept then
    update conversations set status = 'accepted', updated_at = now() where id = p_conversation_id;
  else
    update conversations set status = 'declined', declined_at = now(), updated_at = now() where id = p_conversation_id;
  end if;
end;
$$;

revoke all on function respond_to_conversation_request(uuid, boolean) from public, anon;
grant execute on function respond_to_conversation_request(uuid, boolean) to authenticated;

create or replace function mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  update conversation_participants
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();
end;
$$;

revoke all on function mark_conversation_read(uuid) from public, anon;
grant execute on function mark_conversation_read(uuid) to authenticated;

notify pgrst, 'reload schema';
