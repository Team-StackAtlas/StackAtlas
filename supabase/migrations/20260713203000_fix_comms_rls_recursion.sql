-- Fix infinite RLS recursion in the 0009 comms policies.
--
-- conversation_participants_member_read and quarter_members_member_read were
-- written with subqueries on their OWN table ("who else is in this
-- conversation/quarter"), which Postgres rejects at query time with
-- 42P17 "infinite recursion detected in policy" — the policy's subquery
-- re-triggers the same policy. Because the conversations/messages/quarters/
-- quarter_messages policies all subquery those two membership tables, EVERY
-- authenticated read of comms data failed, not just membership reads. This
-- went unnoticed because RPC verification ran as postgres (RLS bypassed)
-- and CI runs in seed mode.
--
-- Standard fix: SECURITY DEFINER membership helpers that read the
-- membership tables without RLS, and policies that call the helper instead
-- of subquerying the table directly. Semantics are unchanged.

create or replace function is_conversation_participant(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.user_id = auth.uid()
  );
$$;
revoke all on function is_conversation_participant(uuid) from public, anon;
grant execute on function is_conversation_participant(uuid) to authenticated;

create or replace function is_quarter_member(p_quarter_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from quarter_members qm
    where qm.quarter_id = p_quarter_id and qm.user_id = auth.uid()
      and qm.removed_at is null
  );
$$;
revoke all on function is_quarter_member(uuid) from public, anon;
grant execute on function is_quarter_member(uuid) to authenticated;

drop policy if exists conversations_member_read on conversations;
create policy conversations_member_read on conversations
  for select using (is_conversation_participant(id));

drop policy if exists conversation_participants_member_read on conversation_participants;
create policy conversation_participants_member_read on conversation_participants
  for select using (user_id = auth.uid() or is_conversation_participant(conversation_id));

drop policy if exists messages_member_read on messages;
create policy messages_member_read on messages
  for select using (is_conversation_participant(conversation_id));

drop policy if exists messages_member_insert on messages;
create policy messages_member_insert on messages
  for insert with check (
    sender_id = auth.uid()
    and is_conversation_participant(conversation_id)
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.status = 'accepted'
    )
  );

drop policy if exists quarters_member_read on quarters;
create policy quarters_member_read on quarters
  for select using (is_quarter_member(id));

drop policy if exists quarter_members_member_read on quarter_members;
create policy quarter_members_member_read on quarter_members
  for select using (user_id = auth.uid() or is_quarter_member(quarter_id));

drop policy if exists quarter_messages_member_read on quarter_messages;
create policy quarter_messages_member_read on quarter_messages
  for select using (is_quarter_member(quarter_id));

drop policy if exists quarter_messages_member_insert on quarter_messages;
create policy quarter_messages_member_insert on quarter_messages
  for insert with check (sender_id = auth.uid() and is_quarter_member(quarter_id));

notify pgrst, 'reload schema';
