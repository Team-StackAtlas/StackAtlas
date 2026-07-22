-- Performance-advisor cleanup for the research source link tables.
--
-- 1) Each table had two permissive SELECT policies (site_admin_read +
--    public_read). public_read is `using (true)`, so the admin policy adds
--    nothing except an extra policy evaluation on every row
--    (multiple_permissive_policies lint). Drop the redundant admin policies.
-- 2) Cover the created_by / import_batch_id foreign keys with indexes
--    (unindexed_foreign_keys lint) — batch revert deletes filter on
--    import_batch_id, and user deletion cascades touch created_by.

drop policy if exists research_source_substances_site_admin_read on research_source_substances;
drop policy if exists research_source_brands_site_admin_read on research_source_brands;
drop policy if exists research_source_stacks_site_admin_read on research_source_stacks;

create index if not exists research_source_brands_created_by_idx on research_source_brands (created_by) where created_by is not null;
create index if not exists research_source_brands_batch_idx on research_source_brands (import_batch_id) where import_batch_id is not null;
create index if not exists research_source_stacks_created_by_idx on research_source_stacks (created_by) where created_by is not null;
create index if not exists research_source_stacks_batch_idx on research_source_stacks (import_batch_id) where import_batch_id is not null;

notify pgrst, 'reload schema';
