-- Add covering indexes for foreign keys flagged by the Supabase PERFORMANCE
-- advisor (`unindexed_foreign_keys` lint). Unindexed FKs slow down joins on
-- the referencing table and force a full scan on the child table whenever a
-- row is deleted/updated on the referenced (parent) table.
--
-- Each index below was matched against an FK the advisor actually flagged
-- (table + column derived from the FK constraint name and confirmed against
-- the `create table` / `alter table` statements in supabase/migrations/).
--
-- Two pairs of FKs point at the same column (one lint each) and only need a
-- single index to cover both:
--   - library_albums.owner_id: covers both library_albums_owner_id_fkey
--     (-> users) and library_albums_owner_profile_fk (-> profiles)
--   - posts.author_id: covers both posts_author_id_fkey (-> users) and
--     posts_author_profile_fk (-> profiles)
--
-- Skipped: `community_comments_author_id_fkey`, `community_comments_parent_id_fkey`,
-- and `community_reports_reporter_id_fkey` were flagged by the advisor but
-- `community_comments` / `community_reports` are orphaned legacy production
-- tables with no definition anywhere in supabase/migrations/ (see the note in
-- 20260713001500_posts_persistence.sql) -- can't confirm the columns exist
-- against tracked schema, so left untouched.
--
-- Out of scope (reported separately, not acted on here):
--   - `unused_index` lints (sources_target_idx, community_posts_public_idx,
--     community_posts_author_idx, community_posts_entity_idx,
--     community_comments_post_idx) -- unused-so-far isn't evidence they're
--     safe to drop, and several are on the same orphaned community_* tables.
--   - `auth_rls_initplan` / `multiple_permissive_policies` lints -- policy
--     changes, out of scope for an index migration.

-- admin_notes
create index if not exists admin_notes_admin_user_id_idx on public.admin_notes (admin_user_id);

-- brand_health_labels / brand_ingredients / brand_products
create index if not exists brand_health_labels_brand_product_id_idx on public.brand_health_labels (brand_product_id);
create index if not exists brand_ingredients_brand_product_id_idx on public.brand_ingredients (brand_product_id);
create index if not exists brand_products_substance_id_idx on public.brand_products (substance_id);

-- brand_star_ratings
create index if not exists brand_star_ratings_user_id_idx on public.brand_star_ratings (user_id);

-- comms_typing_states
create index if not exists comms_typing_states_conversation_id_idx on public.comms_typing_states (conversation_id);
create index if not exists comms_typing_states_quarter_id_idx on public.comms_typing_states (quarter_id);
create index if not exists comms_typing_states_user_id_idx on public.comms_typing_states (user_id);

-- conversation_participants / conversations
create index if not exists conversation_participants_user_id_idx on public.conversation_participants (user_id);
create index if not exists conversations_created_by_idx on public.conversations (created_by);

-- follow_requests
create index if not exists follow_requests_target_user_id_idx on public.follow_requests (target_user_id);

-- glossary_terms
create index if not exists glossary_terms_created_by_idx on public.glossary_terms (created_by);

-- library_albums (covers library_albums_owner_id_fkey and library_albums_owner_profile_fk)
create index if not exists library_albums_owner_id_idx on public.library_albums (owner_id);

-- message_attachments / message_reactions / message_read_states
create index if not exists message_attachments_message_id_idx on public.message_attachments (message_id);
create index if not exists message_reactions_user_id_idx on public.message_reactions (user_id);
create index if not exists message_read_states_user_id_idx on public.message_read_states (user_id);

-- messages
create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);

-- moderation_log
create index if not exists moderation_log_admin_user_id_idx on public.moderation_log (admin_user_id);
create index if not exists moderation_log_related_report_id_idx on public.moderation_log (related_report_id);
create index if not exists moderation_log_related_suggest_edit_id_idx on public.moderation_log (related_suggest_edit_id);

-- moderation_queue
create index if not exists moderation_queue_assignee_id_idx on public.moderation_queue (assignee_id);
create index if not exists moderation_queue_source_report_id_idx on public.moderation_queue (source_report_id);

-- notifications
create index if not exists notifications_actor_id_idx on public.notifications (actor_id);
create index if not exists notifications_recipient_id_idx on public.notifications (recipient_id);
create index if not exists notifications_user_id_idx on public.notifications (user_id);

-- post_bearings / post_comment_votes / post_comments / post_votes
create index if not exists post_bearings_bearing_id_idx on public.post_bearings (bearing_id);
create index if not exists post_comment_votes_user_id_idx on public.post_comment_votes (user_id);
create index if not exists post_comments_author_id_idx on public.post_comments (author_id);
create index if not exists post_comments_parent_id_idx on public.post_comments (parent_id);
create index if not exists post_votes_user_id_idx on public.post_votes (user_id);

-- posts (author_id covers posts_author_id_fkey and posts_author_profile_fk)
create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists posts_brand_id_idx on public.posts (brand_id);
create index if not exists posts_deleted_by_idx on public.posts (deleted_by);
create index if not exists posts_restored_by_idx on public.posts (restored_by);
create index if not exists posts_stack_id_idx on public.posts (stack_id);
create index if not exists posts_substance_id_idx on public.posts (substance_id);

-- profiles
create index if not exists profiles_deleted_by_idx on public.profiles (deleted_by);
create index if not exists profiles_restored_by_idx on public.profiles (restored_by);

-- quarter_invites / quarter_members / quarter_message_attachments / quarter_messages / quarters
create index if not exists quarter_invites_invitee_id_idx on public.quarter_invites (invitee_id);
create index if not exists quarter_invites_inviter_id_idx on public.quarter_invites (inviter_id);
create index if not exists quarter_members_user_id_idx on public.quarter_members (user_id);
create index if not exists quarter_message_attachments_quarter_message_id_idx on public.quarter_message_attachments (quarter_message_id);
create index if not exists quarter_messages_deleted_by_idx on public.quarter_messages (deleted_by);
create index if not exists quarter_messages_quarter_id_idx on public.quarter_messages (quarter_id);
create index if not exists quarter_messages_restored_by_idx on public.quarter_messages (restored_by);
create index if not exists quarter_messages_sender_id_idx on public.quarter_messages (sender_id);
create index if not exists quarters_owner_id_idx on public.quarters (owner_id);

-- reports
create index if not exists reports_reported_user_id_idx on public.reports (reported_user_id);

-- research_findings
create index if not exists research_findings_created_by_idx on public.research_findings (created_by);
create index if not exists research_findings_import_batch_id_idx on public.research_findings (import_batch_id);
create index if not exists research_findings_reviewed_by_idx on public.research_findings (reviewed_by);
create index if not exists research_findings_source_id_idx on public.research_findings (source_id);
create index if not exists research_findings_substance_id_idx on public.research_findings (substance_id);

-- research_import_batches
create index if not exists research_import_batches_imported_by_idx on public.research_import_batches (imported_by);

-- research_source_substances
create index if not exists research_source_substances_created_by_idx on public.research_source_substances (created_by);
create index if not exists research_source_substances_import_batch_id_idx on public.research_source_substances (import_batch_id);
create index if not exists research_source_substances_substance_id_idx on public.research_source_substances (substance_id);

-- research_sources
create index if not exists research_sources_created_by_idx on public.research_sources (created_by);
create index if not exists research_sources_import_batch_id_idx on public.research_sources (import_batch_id);

-- stack_components / stacks
create index if not exists stack_components_substance_id_idx on public.stack_components (substance_id);
create index if not exists stacks_creator_id_idx on public.stacks (creator_id);

-- substance_administration_methods / substance_aliases / substance_effects /
-- substance_markers / substance_pairings / substance_routes / substance_type_tags
create index if not exists substance_administration_methods_administration_method_id_idx on public.substance_administration_methods (administration_method_id);
create index if not exists substance_aliases_substance_id_idx on public.substance_aliases (substance_id);
create index if not exists substance_effects_substance_id_idx on public.substance_effects (substance_id);
create index if not exists substance_markers_marker_id_idx on public.substance_markers (marker_id);
create index if not exists substance_pairings_pairs_with_id_idx on public.substance_pairings (pairs_with_id);
create index if not exists substance_routes_category_route_id_idx on public.substance_routes (category_route_id);
create index if not exists substance_type_tags_type_tag_id_idx on public.substance_type_tags (type_tag_id);

-- substances
create index if not exists substances_most_popular_brand_id_idx on public.substances (most_popular_brand_id);

-- suggest_edits
create index if not exists suggest_edits_submitter_user_id_idx on public.suggest_edits (submitter_user_id);

notify pgrst, 'reload schema';
