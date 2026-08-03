-- Drop the vestigial polymorphic `sources` table.
--
-- This table was defined in 0001_initial_schema.sql as a generic citation
-- store (attach a claim + URL to any object in a page section). It was
-- superseded by the research_* pipeline (research_sources + research_findings
-- + research_source_{substances,brands,stacks}) before it was ever used:
--
--   * 0 rows in production.
--   * No references anywhere in the application code (no .from('sources')).
--
-- See docs/research-import/SOURCE-SYSTEM-AUDIT.md for the full audit.
--
-- The table's index drops with it. Its two enums (source_section, source_type)
-- are each used by exactly one column — on this table — so they are dropped
-- too. object_type is NOT touched: it is shared by reports / suggest_edits /
-- moderation. All statements are guarded so this migration is idempotent.

drop table if exists sources;

drop type if exists source_section;
drop type if exists source_type;
