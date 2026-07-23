-- Catalog cleanup: remove imported entries that are ingredient-classes, not
-- single substances, so they stop appearing as standalone entries on the Map.
--
-- Scope (audited against every imported batch; 45 unique substances total):
--   * probiotics        — category "Microbial ingredients" / "Microbiome products"
--   * electrolyte-blends — category "Multi-ingredient formulation category"
-- (No "E. coli Nissle 1917" row exists in any import — nothing to remove for it.)
--
-- FK reality check (post-20260712221226): the run-era tables
-- (research_runs, research_extracted_notes) are dropped and research_sources
-- no longer carries substance_id, so the only remaining ON DELETE RESTRICT
-- references to substances are stack_components and
-- research_source_substances (0001_initial_schema.sql:209,
-- 20260711190452_research_import_system.sql:105). Those child rows are
-- cleared first, scoped to exactly these two substances; every other child
-- table resolves via its own ON DELETE rule (cascade on the substance_*
-- satellites, set null on brand_products/posts). Sources whose only substance
-- link was one of these two remain in the admin source library, just
-- unlinked — preferable to deleting shared sources.
--
-- Reversible only by re-import. Review before applying. Idempotent: re-running
-- after the rows are gone is a no-op.
begin;

create temporary table _cleanup_targets on commit drop as
  select id from substances where slug in ('probiotics', 'electrolyte-blends');

delete from research_source_substances where substance_id in (select id from _cleanup_targets);
delete from stack_components           where substance_id in (select id from _cleanup_targets);

delete from substances where id in (select id from _cleanup_targets);

commit;
