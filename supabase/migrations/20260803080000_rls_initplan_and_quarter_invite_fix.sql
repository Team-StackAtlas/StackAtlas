-- RLS performance: stop re-evaluating auth.uid() per row.
--
-- Every policy below referenced auth.uid() bare, which Postgres evaluates
-- once per candidate row. Wrapping it as (select auth.uid()) makes the
-- planner treat it as an InitPlan evaluated once per statement — the
-- documented fix for the `auth_rls_initplan` advisor lint (59 findings, all
-- addressed here — 49 rewritten in place below, 10 eliminated by dropping the
-- orphaned community_* tables at the end of this file; expressions otherwise
-- unchanged, generated from pg_policies so nothing drifts from what was live).
--
-- One real bug fixed along the way, flagged separately below:
-- quarters_invitee_read compared qi.quarter_id = qi.id (the invite's own
-- primary key — false for every row), so a pending invitee could never see
-- the quarter they were invited to. It now correctly joins qi.quarter_id =
-- quarters.id.

alter policy brand_ratings_write on public.brand_star_ratings
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy comms_typing_owner on public.comms_typing_states
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy conversation_participants_member_read on public.conversation_participants
  using (((user_id = (select auth.uid())) OR is_conversation_participant(conversation_id)));

alter policy follow_requests_private_delete on public.follow_requests
  using ((((select auth.uid()) = requester_id) OR ((select auth.uid()) = target_user_id)));

alter policy follow_requests_private_read on public.follow_requests
  using ((((select auth.uid()) = requester_id) OR ((select auth.uid()) = target_user_id)));

alter policy follow_requests_requester_insert on public.follow_requests
  with check (((select auth.uid()) = requester_id));

alter policy follows_owner on public.follows
  using (((select auth.uid()) = follower_id))
  with check (((select auth.uid()) = follower_id));

alter policy hidden_owner on public.hidden_items
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy library_album_items_owner_write on public.library_album_items
  using ((EXISTS ( SELECT 1
   FROM library_albums a
  WHERE ((a.id = library_album_items.album_id) AND (a.owner_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM library_albums a
  WHERE ((a.id = library_album_items.album_id) AND (a.owner_id = (select auth.uid()))))));

alter policy library_album_items_read on public.library_album_items
  using ((EXISTS ( SELECT 1
   FROM library_albums a
  WHERE ((a.id = library_album_items.album_id) AND ((a.privacy = 'public'::library_album_privacy) OR (a.owner_id = (select auth.uid())))))));

alter policy library_albums_owner_write on public.library_albums
  using (((select auth.uid()) = owner_id))
  with check (((select auth.uid()) = owner_id));

alter policy library_albums_read on public.library_albums
  using (((privacy = 'public'::library_album_privacy) OR ((select auth.uid()) = owner_id)));

alter policy message_attachments_member_read on public.message_attachments
  using ((EXISTS ( SELECT 1
   FROM (messages m
     JOIN conversation_participants cp ON ((cp.conversation_id = m.conversation_id)))
  WHERE ((m.id = message_attachments.message_id) AND (cp.user_id = (select auth.uid()))))));

alter policy message_attachments_sender_insert on public.message_attachments
  with check (((EXISTS ( SELECT 1
   FROM messages m
  WHERE ((m.id = message_attachments.message_id) AND (m.sender_id = (select auth.uid()))))) AND is_conversation_participant(( SELECT messages.conversation_id
   FROM messages
  WHERE (messages.id = message_attachments.message_id)))));

alter policy message_reactions_member on public.message_reactions
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy message_reactions_participant_read on public.message_reactions
  using ((EXISTS ( SELECT 1
   FROM (messages m
     JOIN conversation_participants cp ON ((cp.conversation_id = m.conversation_id)))
  WHERE ((m.id = message_reactions.message_id) AND (cp.user_id = (select auth.uid()))))));

alter policy message_read_states_owner on public.message_read_states
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy messages_member_insert on public.messages
  with check (((sender_id = (select auth.uid())) AND is_conversation_participant(conversation_id) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND (c.status = 'accepted'::comms_conversation_status))))));

alter policy notification_settings_owner on public.notification_settings
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy notifications_owner on public.notifications
  using ((((select auth.uid()) = recipient_id) OR ((select auth.uid()) = user_id)));

alter policy notifications_owner_update on public.notifications
  using ((((select auth.uid()) = recipient_id) OR ((select auth.uid()) = user_id)))
  with check ((((select auth.uid()) = recipient_id) OR ((select auth.uid()) = user_id)));

alter policy post_bearings_author_write on public.post_bearings
  using ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = post_bearings.post_id) AND (p.author_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = post_bearings.post_id) AND (p.author_id = (select auth.uid()))))));

alter policy post_comment_votes_owner_write on public.post_comment_votes
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy post_comments_author_insert on public.post_comments
  with check (((select auth.uid()) = author_id));

alter policy post_comments_author_update on public.post_comments
  using ((((select auth.uid()) = author_id) OR is_site_admin()))
  with check ((((select auth.uid()) = author_id) OR is_site_admin()));

alter policy post_votes_write on public.post_votes
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy posts_author_insert on public.posts
  with check (((select auth.uid()) = author_id));

alter policy posts_author_update on public.posts
  using ((((select auth.uid()) = author_id) OR is_site_admin()))
  with check ((((select auth.uid()) = author_id) OR is_site_admin()));

alter policy posts_public_read on public.posts
  using (((deleted_at IS NULL) OR ((select auth.uid()) = author_id) OR is_site_admin()));

alter policy profiles_write on public.profiles
  using (((select auth.uid()) = id))
  with check (((select auth.uid()) = id));

alter policy quarter_invites_visible on public.quarter_invites
  using (((invitee_id = (select auth.uid())) OR (inviter_id = (select auth.uid()))));

alter policy quarter_members_member_read on public.quarter_members
  using (((user_id = (select auth.uid())) OR is_quarter_member(quarter_id)));

alter policy quarter_message_attachments_sender_insert on public.quarter_message_attachments
  with check ((EXISTS ( SELECT 1
   FROM quarter_messages qm
  WHERE ((qm.id = quarter_message_attachments.quarter_message_id) AND (qm.sender_id = (select auth.uid())) AND is_quarter_member(qm.quarter_id)))));

alter policy quarter_message_reactions_member_read on public.quarter_message_reactions
  using ((EXISTS ( SELECT 1
   FROM (quarter_messages qm
     JOIN quarter_members m ON ((m.quarter_id = qm.quarter_id)))
  WHERE ((qm.id = quarter_message_reactions.quarter_message_id) AND (m.user_id = (select auth.uid())) AND (m.removed_at IS NULL)))));

alter policy quarter_message_reactions_own_delete on public.quarter_message_reactions
  using ((user_id = (select auth.uid())));

alter policy quarter_message_reactions_own_write on public.quarter_message_reactions
  with check ((user_id = (select auth.uid())));

alter policy quarter_messages_member_insert on public.quarter_messages
  with check (((sender_id = (select auth.uid())) AND is_quarter_member(quarter_id)));

-- BUG FIX: was `qi.quarter_id = qi.id` (self-comparison, never true), which
-- made quarters invisible to pending invitees. Correct join + initplan wrap.
alter policy quarters_invitee_read on public.quarters
  using ((EXISTS ( SELECT 1
   FROM quarter_invites qi
  WHERE ((qi.quarter_id = quarters.id) AND (qi.invitee_id = (select auth.uid())) AND (qi.status = 'pending'::quarter_invite_status)))));

alter policy quarters_owner_insert on public.quarters
  with check ((owner_id = (select auth.uid())));

alter policy quarters_owner_update on public.quarters
  using ((owner_id = (select auth.uid())))
  with check ((owner_id = (select auth.uid())));

alter policy reports_owner_insert on public.reports
  with check ((((select auth.uid()) IS NOT NULL) AND (reporter_user_id = (select auth.uid()))));

alter policy reports_owner_read on public.reports
  using ((reporter_user_id = (select auth.uid())));

alter policy reports_owner_update on public.reports
  using ((reporter_user_id = (select auth.uid())))
  with check ((reporter_user_id = (select auth.uid())));

alter policy saved_owner on public.saved_items
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy suggest_edits_owner_insert on public.suggest_edits
  with check ((((select auth.uid()) IS NOT NULL) AND (submitter_user_id = (select auth.uid()))));

alter policy suggest_edits_owner_read on public.suggest_edits
  using ((submitter_user_id = (select auth.uid())));

alter policy users_insert_own on public.users
  with check (((select auth.uid()) = id));

alter policy users_read_own on public.users
  using (((select auth.uid()) = id));

alter policy users_update_own on public.users
  using (((select auth.uid()) = id))
  with check (((select auth.uid()) = id));

-- Storage policies flagged by the same lint.
alter policy comms_media_owner_delete on storage.objects
  using (((bucket_id = 'comms-media'::text) AND (owner = (select auth.uid()))));

-- Orphan cleanup: the post-images bucket policies came from a community
-- posting branch that was reverted in code but left applied in the database.
-- Post images ship as data-urls in posts.image_url (20260723070000), the
-- bucket holds zero objects, and nothing in src/ references it — so drop the
-- policies rather than optimize them. The read policy was also flagged by
-- the public_bucket_allows_listing advisor (it let any client enumerate the
-- bucket). The bucket itself stays; without policies it is inert.
drop policy if exists post_images_public_read on storage.objects;
drop policy if exists post_images_auth_upload on storage.objects;

-- Covering indexes for the FKs the unindexed_foreign_keys advisor flags —
-- these are the columns cascade deletes and reverse lookups scan. (The three
-- flagged community_* FKs are resolved by the table drops below instead.)
create index if not exists product_variants_superseded_by_idx on product_variants (superseded_by);
create index if not exists research_queue_substance_id_idx on research_queue (substance_id);
create index if not exists test_results_created_by_idx on test_results (created_by);
create index if not exists test_results_reviewed_by_idx on test_results (reviewed_by);

-- ---------------------------------------------------------------------------
-- Orphan cleanup: the community_* posting system
-- ---------------------------------------------------------------------------
-- Same reverted branch as the post-images bucket ("Build Supabase community
-- posting system", later reverted in code). The tables, their policies, and
-- three anon-executable SECURITY DEFINER RPCs stayed live in the database.
-- Nothing in src/ references any of them (the shipped posting system is the
-- posts/post_comments family); the only stored row is a gibberish draft
-- ("sdfasdfasd", 2026-06-10). The RPC drops also clear the advisor warnings
-- about anon-callable SECURITY DEFINER functions for this family.
drop function if exists community_posts_with_counts(uuid);
drop function if exists community_post_with_counts(uuid, uuid);
drop function if exists community_comments_with_counts(uuid, uuid);
drop table if exists community_reports;
drop table if exists community_likes;
drop table if exists community_comments;
drop table if exists community_posts;
