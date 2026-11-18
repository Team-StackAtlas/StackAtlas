-- Performance advisor follow-ups for the 2026-10/11 migrations.
-- 1. Covering indexes for foreign keys on the new research tables.
create index if not exists research_submissions_import_batch_id_idx on research_submissions (import_batch_id);
create index if not exists research_submissions_reviewed_by_idx on research_submissions (reviewed_by);
create index if not exists substance_description_history_substance_id_idx on substance_description_history (substance_id);
create index if not exists substance_description_history_submission_id_idx on substance_description_history (submission_id);
create index if not exists substance_description_history_changed_by_idx on substance_description_history (changed_by);

-- 2. Evaluate auth.uid() once per query instead of once per row.
drop policy if exists account_deletion_requests_own_read on account_deletion_requests;
create policy account_deletion_requests_own_read on account_deletion_requests
  for select using ((select auth.uid()) = user_id or is_site_owner());

-- 3. brand_star_ratings already has (brand_id, user_id) as its primary key; the
--    one-per-user unique index from 20261020123000 duplicated it.
drop index if exists brand_star_ratings_one_per_user;
