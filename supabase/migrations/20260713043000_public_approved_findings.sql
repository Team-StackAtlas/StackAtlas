-- Public read access for APPROVED research findings and the sources they
-- cite, so substance pages can render reviewed research. Pending, rejected,
-- and archived findings stay admin-only; import batches and source-substance
-- links stay admin-only. Policies are additive (OR'd with the existing
-- site-admin read policies).

drop policy if exists research_findings_public_read_approved on research_findings;
create policy research_findings_public_read_approved on research_findings
  for select using (review_status = 'approved');

drop policy if exists research_sources_public_read_cited on research_sources;
create policy research_sources_public_read_cited on research_sources
  for select using (
    exists (
      select 1 from research_findings f
      where f.source_id = research_sources.id
        and f.review_status = 'approved'
    )
  );

grant select on research_findings, research_sources to anon;

notify pgrst, 'reload schema';
