-- Fix the remaining 400s on Comms in production — same bug class as
-- 20260722060000_fix_profile_embeds.sql (follow_requests / quarter_invites),
-- for the four other tables the client embeds profile data through:
--   conversation_participants?select=...,profiles!conversation_participants_user_id_fkey(...)
--   quarter_members?select=...,profiles!quarter_members_user_id_fkey(...)
--   quarter_messages?select=...,profiles!quarter_messages_sender_id_fkey(...)
--   quarters?select=...,profiles!quarters_owner_id_fkey(...)
--
-- Each FK pointed at users(id), not profiles(id), so PostgREST rejected the
-- embed with a 400 — breaking conversation participant lists, quarter
-- member lists, quarter message sender profiles, and quarter owner info
-- (i.e. most of Comms beyond a bare 1:1 DM).
--
-- profiles.id is a 1:1 shadow of users.id (FK ON DELETE CASCADE), so
-- repointing at profiles(id) keeps identical delete semantics. Constraint
-- names are preserved so the client hints keep matching. The DO block
-- below verifies zero orphaned rows before altering anything and aborts
-- the whole migration if any are found, rather than relying on a separate
-- pre-check query.

do $$
declare v_bad bigint;
begin
  select count(*) into v_bad
  from conversation_participants cp left join profiles p on p.id = cp.user_id
  where p.id is null;
  if v_bad > 0 then raise exception 'conversation_participants has % row(s) with no matching profile', v_bad; end if;

  select count(*) into v_bad
  from quarter_members qm left join profiles p on p.id = qm.user_id
  where p.id is null;
  if v_bad > 0 then raise exception 'quarter_members has % row(s) with no matching profile', v_bad; end if;

  select count(*) into v_bad
  from quarter_messages qmsg left join profiles p on p.id = qmsg.sender_id
  where p.id is null;
  if v_bad > 0 then raise exception 'quarter_messages has % row(s) with no matching profile', v_bad; end if;

  select count(*) into v_bad
  from quarters q left join profiles p on p.id = q.owner_id
  where p.id is null;
  if v_bad > 0 then raise exception 'quarters has % row(s) with no matching profile', v_bad; end if;
end $$;

alter table conversation_participants drop constraint conversation_participants_user_id_fkey;
alter table conversation_participants
  add constraint conversation_participants_user_id_fkey
  foreign key (user_id) references profiles (id) on delete cascade;

alter table quarter_members drop constraint quarter_members_user_id_fkey;
alter table quarter_members
  add constraint quarter_members_user_id_fkey
  foreign key (user_id) references profiles (id) on delete cascade;

alter table quarter_messages drop constraint quarter_messages_sender_id_fkey;
alter table quarter_messages
  add constraint quarter_messages_sender_id_fkey
  foreign key (sender_id) references profiles (id) on delete cascade;

alter table quarters drop constraint quarters_owner_id_fkey;
alter table quarters
  add constraint quarters_owner_id_fkey
  foreign key (owner_id) references profiles (id) on delete cascade;

notify pgrst, 'reload schema';
