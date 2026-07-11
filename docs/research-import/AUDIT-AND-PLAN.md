# Research & Data Import System — Audit and Plan

Date: July 11, 2026
Branch: `claude/research-source-system-bmu9wg`

## Part 1 — Audit findings

### The importer was never broken in the way it looked broken

The PR 47/48 importer code is mostly sound. It failed in production because of
**repo/database drift**, not because of the parsing or UI logic:

1. **Repo migrations `0014_owner_bulk_research_sources.sql` and
   `0015_repair_research_source_ingestion.sql` were never applied to the
   production database.** Production's migration history ends at a different
   `0014` ("admin_research_substance_picker_foundation") left over from the
   reverted run-based work. `research_source_substances`,
   `research_import_batches`, and all four import RPCs do not exist in
   production. That is the direct cause of "Failed to load research sources."
2. **Production `research_sources` still has the old run-based shape**
   (`research_run_id`, mandatory `substance_id`, `match_status`,
   `source_tier`).
3. **Production has an event trigger (`rls_auto_enable`) that force-enables
   RLS on every new table.** Roughly 20 catalog tables (`substances`,
   `brands`, `stacks`, all join tables, `posts`, `sources`, vocab tables) have
   RLS enabled with **zero policies**, which in Postgres means deny-all. The
   `substances` select in AdminResearch fails, so CSV parsing is blocked or
   every row falls back to a substance-matching failure.
4. **Production `substances` has 5 rows; the deployed Map shows ~30.** The
   entire public catalog (Map, substance/brand/stack pages, Square posts)
   renders from a bundled `src/data/mockData.ts` (926 lines) and localStorage.
   Supabase is only wired for accounts/social. Importing data into Supabase
   today changes nothing a user can see.
5. Wider drift discovered along the way: production has `community_*` tables
   with no corresponding repo migration, and the repo's `0006_library.sql`
   tables (`library_albums`, `library_album_items`) **do not exist in
   production** — Library persistence is broken in production. Out of scope
   for this push, but it is a launch blocker to sequence next.
6. Dead schema: `research_runs` and `research_extracted_notes` still exist in
   production with demo seed rows. Nothing in `src/` references them. They
   should be dropped in a follow-up once Domonic confirms (not done here to
   avoid destructive changes without sign-off).

### Smaller code-level issues (confirmed by line-level audit)

- `AdminResearch.tsx` (539 lines) bypasses the service layer for reads and
  duplicates dedup logic that already exists in `sourceImport.ts`.
- The hand-rolled CSV parser does not validate column counts; an unescaped
  comma silently shifts every following cell (the likely cause of "blank
  preview fields" and misleading "Missing Substance" rows).
- Substance matching happens client-side against UUIDs; the import RPC
  requires a resolved `substance_id`, so any catalog gap becomes a hard
  failure with a confusing status.
- No `notify pgrst, 'reload schema'` after DDL, so even correctly applied
  migrations can appear broken until PostgREST reloads.

## Part 2 — Can the assistant gather research data itself?

Split answer, honestly:

- **Source metadata: yes, safely.** Bibliographic records (title, authors,
  year, journal, PMID, DOI) can be fetched from PubMed E-utilities and
  verified programmatically. Zero hallucination risk because nothing is
  generated — only fetched and checked. Small verified packs can be produced
  this way.
- **Substance profiles and findings at scale: no, not directly.** Generating
  thousands of dose ranges, half-lives, risk statements, and source-backed
  findings inside coding sessions on an expensive model is the wrong tool:
  costly, slow, and unreviewable in bulk. Hallucinated-but-plausible rows are
  the specific failure mode a research product cannot afford.

**Therefore the durable system is the one Domonic proposed:** generate data
externally with cheaper models (Haiku, GPT-mini class) against a strict,
versioned pack format, then import through a validating, deduplicating,
auditable pipeline where findings land as `pending_review`, never public.

## Part 3 — The plan (this push)

1. **Migration `0016_research_import_system.sql`** — one idempotent
   convergence migration that produces the target state from either drifted
   starting point:
   - Public-read RLS policies for catalog + vocab tables; admin-gated writes.
   - Rework `research_sources` (nullable `substance_id`, drop run coupling on
     new writes), create `research_source_substances`,
     `research_import_batches` (extended with `entity_counts`,
     `schema_version`, `generated_by`, `label`), `research_findings`
     (per the July 11 handoff §22, `review_status` default `pending_review`),
     and `substance_aliases` for name matching.
   - Substance enrichment columns the product needs: `origin`, `half_life`,
     `how_obtained` (all nullable text).
   - SECURITY DEFINER import RPCs that accept **slug/DOI/PMID natural keys**
     (not UUIDs) and resolve server-side:
     `admin_import_substances`, `admin_import_brands`, `admin_import_stacks`,
     `admin_import_sources`, `admin_import_findings` — each takes
     `p_rows jsonb`, upserts on natural keys, links relations, and returns
     per-row results. Owner/admin checked inside the function body.
   - `notify pgrst, 'reload schema'` at the end.
2. **Data-pack format v1** (`src/services/import/types.ts` +
   `docs/data-packs/`): one JSON envelope with `schema_version`,
   `generated_by`, and per-entity arrays; cross-references by natural key
   (substance `slug`, source `doi`/`pmid`/`url`, brand `slug`). CSV still
   accepted for plain source lists.
3. **Import engine** (`src/services/import/`): parse → per-row validation
   with structured issues → dedup preview against live keys → chunked RPC
   import → batch audit record. Pure functions, no UI coupling.
4. **Admin Research rebuild** (`src/pages/AdminResearch.tsx` + components):
   Import wizard (paste/upload → validation report → preview grid → import →
   results), Source Library, Import History. No run-based UI.
5. **Catalog read path**: `CatalogProvider` loads substances/brands/stacks
   from Supabase when configured (mock fallback otherwise); Map,
   SupplementPage, BrandPage, StackPage read through it. The existing mock
   catalog is exported as a data pack and imported into production through
   the new pipeline, so the site keeps its content while gaining persistence.
6. **Generation kit** (`docs/data-packs/`): the JSON contract, prompt
   templates for cheaper models, and sample packs (valid + intentionally
   broken for testing).

### Deferred (explicitly)

- Public research/findings pages (needs approved findings first).
- Findings review queue UI beyond basic status visibility.
- Dropping `research_runs` / `research_extracted_notes` (needs sign-off).
- Library persistence repair, community/migration drift reconciliation for
  non-research tables (next push; flagged as launch blockers).
- AI extraction, PubMed discovery UI, additional source providers.
