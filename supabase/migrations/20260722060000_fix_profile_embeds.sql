-- Fix 400s on Message Requests and Quarter Invites in production.
--
-- The client embeds profile data through these relationships, e.g.
--   follow_requests?select=...,profiles!follow_requests_requester_id_fkey(username,avatar_url)
-- but the foreign keys pointed at users(id), not profiles(id), so PostgREST
-- rejected the embed with a 400 and the lists never loaded.
--
-- profiles.id is a 1:1 shadow of users.id (FK ON DELETE CASCADE), so
-- repointing these FKs at profiles(id) keeps identical delete semantics
-- (user deleted -> profile cascades -> these rows cascade) while making the
-- embeds valid. Constraint names are preserved so the client hints match.
-- Verified before applying: zero rows violate the new references.

alter table follow_requests drop constraint follow_requests_requester_id_fkey;
alter table follow_requests
  add constraint follow_requests_requester_id_fkey
  foreign key (requester_id) references profiles (id) on delete cascade;

alter table follow_requests drop constraint follow_requests_target_user_id_fkey;
alter table follow_requests
  add constraint follow_requests_target_user_id_fkey
  foreign key (target_user_id) references profiles (id) on delete cascade;

alter table quarter_invites drop constraint quarter_invites_inviter_id_fkey;
alter table quarter_invites
  add constraint quarter_invites_inviter_id_fkey
  foreign key (inviter_id) references profiles (id) on delete cascade;

alter table quarter_invites drop constraint quarter_invites_invitee_id_fkey;
alter table quarter_invites
  add constraint quarter_invites_invitee_id_fkey
  foreign key (invitee_id) references profiles (id) on delete cascade;

notify pgrst, 'reload schema';
