-- Catalog cleanup: remove imported entries that are ingredient-classes, not
-- single substances, so they stop appearing as standalone entries on the Map.
--
-- Scope (audited against every imported batch; 45 unique substances total):
--   * probiotics        — category "Microbial ingredients" / "Microbiome products"
--   * electrolyte-blends — category "Multi-ingredient formulation category"
-- (No "E. coli Nissle 1917" row exists in any import — nothing to remove for it.)
--
-- Substances are referenced by several tables with ON DELETE RESTRICT
-- (stack_components, research_runs, research_sources, research_extracted_notes,
-- research_source_substances), so those child rows are cleared first, scoped to
-- exactly these two substances; the remaining child tables (routes, type_tags,
-- markers, effects, pairings, aliases, and the SET NULL references) resolve via
-- their own ON DELETE rules when the substance row goes.
--
-- Reversible only by re-import. Review before applying. Idempotent: re-running
-- after the rows are gone is a no-op.
begin;

create temporary table _cleanup_targets on commit drop as
  select id from substances where slug in ('probiotics', 'electrolyte-blends');

delete from research_extracted_notes   where substance_id in (select id from _cleanup_targets);
delete from research_source_substances where substance_id in (select id from _cleanup_targets);
delete from research_sources           where substance_id in (select id from _cleanup_targets);
delete from research_runs              where substance_id in (select id from _cleanup_targets);
delete from stack_components           where substance_id in (select id from _cleanup_targets);

delete from substances where id in (select id from _cleanup_targets);

commit;
