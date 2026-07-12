-- 0017: Remove the dead run-based research schema and stale seed catalog rows.
--
-- The run-based Admin Research system (0012) was replaced by the data-pack
-- import system (0016). Nothing in the app references research_runs or
-- research_extracted_notes anymore, and the sparse substances seeded for the
-- old substance picker ('creatine', 'magnesium', 'omega-3') duplicate the
-- richer catalog imported through the data-pack pipeline.

-- research_sources loses its run-era coupling columns; sources link to
-- substances through research_source_substances now.
alter table research_sources drop column if exists research_run_id;
alter table research_sources drop column if exists substance_id;

drop table if exists research_extracted_notes;
drop table if exists research_runs;

-- Demo sources seeded by 0012 (present in fresh environments) hold
-- research_source_substances links to the stale substances below; remove the
-- sources first so those links cascade away.
delete from research_sources where is_demo;

-- Stale sparse seed substances superseded by the imported catalog.
delete from substances where slug in ('creatine', 'magnesium', 'omega-3');

notify pgrst, 'reload schema';
