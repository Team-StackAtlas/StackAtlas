-- Public read for research sources linked to a substance, so substance pages
-- can render the citations/research on file for that substance — not only the
-- sources cited by an approved finding (which is all the earlier
-- 20260713043000_public_approved_findings policy exposed).
--
-- What becomes public: the source-substance link rows, and any research_source
-- that is linked to at least one substance. These are bibliographic records
-- (title, url, publisher, year, type) meant to be seen. The public query in
-- src/services/research selects only those safe columns; admin-only fields
-- (notes, created_by, import_batch_id) are never returned to the public.
-- Policies are additive — the existing site-admin read policies still apply.

drop policy if exists research_source_substances_public_read on research_source_substances;
create policy research_source_substances_public_read on research_source_substances
  for select using (true);

drop policy if exists research_sources_public_read_linked on research_sources;
create policy research_sources_public_read_linked on research_sources
  for select using (
    exists (
      select 1 from research_source_substances rss
      where rss.source_id = research_sources.id
    )
  );

grant select on research_source_substances to anon, authenticated;
grant select on research_sources to anon, authenticated;

notify pgrst, 'reload schema';
