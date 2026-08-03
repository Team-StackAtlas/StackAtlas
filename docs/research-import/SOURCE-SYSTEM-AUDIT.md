# Source System Audit

_Read-only audit of how "sources" work in StackAtlas — the live pipeline, the
dead schema, and the data-state gaps worth fixing. Snapshot taken against the
production database; row counts will drift as more data is imported._

## TL;DR

There are **two distinct "source" systems** in the codebase:

1. A **polymorphic `sources` table** from the original schema — **0 rows, zero
   code references. Dead/vestigial.**
2. The **`research_*` pipeline** — the actual live system that every page and
   admin tool reads and writes.

Everything user-facing runs on the `research_*` tables. The rest of this doc
covers both, plus the data-state gaps in the live system.

---

## 1. The dead `sources` table

Defined in `supabase/migrations/0001_initial_schema.sql:275`:

```
sources(id, target_type[object_type], target_id, section, claim,
        title, url NOT NULL, source_type, publisher, accessed_at, created_at)
index sources_target_idx on (target_type, target_id)
```

It was the original design: attach a `claim` + `url` citation to any object
(substance / brand / stack) within a page `section`.

- **0 rows in the database.**
- **No `.from('sources')` call anywhere in `src/`.** (Grep hits on
  `target_type` belong to the unrelated `follows` / `reports` tables.)

It was superseded by the `research_*` pipeline before it was ever used, and is
a clean candidate for a drop migration.

---

## 2. The live `research_*` pipeline

Five tables carry the entire source system:

| Table | Rows | Role |
|---|---|---|
| `research_sources` | 484 | Bibliographic records (title, authors, year, journal_or_site, url, doi, pmid, source_type, abstract, + provenance: content_hash, storage_path, import_batch_id, external_ref) |
| `research_findings` | 173 | Extracted claims per substance (endpoint, direction, dose, population, study_type), each citing one source |
| `research_source_substances` | 259 | source ↔ substance links |
| `research_source_brands` | 214 | source ↔ brand links |
| `research_source_stacks` | 0 | source ↔ stack links |
| `research_import_batches` | 7 | Import audit / revert unit |

`source_type` distribution across the 484 sources:

| source_type | count |
|---|---|
| brand_or_vendor_document | 187 |
| human_study | 140 |
| official_label_or_document | 114 |
| in_vitro_or_mechanistic | 21 |
| community_or_influencer_mention | 15 |
| coa_or_testing_document | 3 |
| other | 4 |

### Data flow

**Ingest (admin).** `src/services/import/runner.ts` `runImport()` takes a
validated JSON DataPack and sends it through RPCs (`admin_import_sources`,
`admin_import_findings`, and the link importers), which create a
`research_import_batch`, insert `research_sources` / `research_findings`, and
populate the link tables. Admin UI: `SourceLibrary.tsx`
(`listSourceLibrary` / `editSource`) and the findings review queue
(`listFindings`). Validation and the accepted `source_type` set live in
`src/services/import/{types,validate,markdown}.ts`
(`RESEARCH_SOURCE_TYPES_V1`).

**Public read.** `src/services/research/index.ts`:
- `listApprovedFindings` → `research_findings` filtered to
  `review_status='approved'` → findings section of `SupplementPage`.
- `listSubstanceSources` / `listBrandSources` / `listStackSources` → the
  `research_source_*` link tables → `ResearchSourcesCard` on the
  Supplement / Brand / Stack pages.

Relevant migrations: `20260711190452_research_import_system.sql`,
`20260713043000_public_approved_findings.sql`,
`20260713051500_source_document_provenance.sql`,
`20260721030000_public_substance_sources.sql`,
`20260722040000_source_brand_stack_links.sql`,
`20260723080000_importer_phase2_dataset_support.sql`.

---

## 3. Data-state gaps in the live system

These are not bugs in the code — they're consequences of the current data and
of which workflows are actually being exercised.

1. **The per-source review/tiering workflow is unused.** All 484 sources are
   `review_status='unreviewed'`, `source_tier='unknown'`,
   `match_status='strong_match'`, `is_demo=false`, `storage_path=null`. Only
   *findings* get reviewed and approved; the source-level review and tier
   columns exist but nothing populates them.

2. **~70% of sources are never cited by a finding.** Only 144 of 484 sources
   are referenced by a `research_finding`; the other 340 are bibliographic
   records with no extracted claim pointing at them. (All 173 findings do have
   a source — `findings_without_source = 0` — so this is one-directional.)

3. **251 of 484 sources have no substance link.** With no row in
   `research_source_substances`, these sources can never surface in a
   substance page's "research on file" list, regardless of review state.

4. **`research_source_stacks` is empty.** The Stack page's
   `ResearchSourcesCard` is therefore always empty in practice.

5. **Findings and their linked-source list use different gates.** Findings are
   filtered to `review_status='approved'`, but `listSubstanceSources` /
   `listBrandSources` / `listStackSources` apply **no** review filter — they
   rely purely on RLS from `20260721030000_public_substance_sources.sql`. A
   substance can therefore show "sources on file" whose findings aren't
   approved, or that have no finding at all.

Findings currently span **40 substances**.

---

## 4. Suggested follow-ups

- ~~**Drop the dead `sources` table**~~ — done in
  `supabase/migrations/20260803160000_drop_dead_sources_table.sql` (the table
  plus its two exclusive enums `source_section` / `source_type`; `object_type`
  is shared and kept).
- **Decide the intended gate for linked sources.** If "sources on file" should
  track finding approval, align `listSubstanceSources` et al. with the
  findings gate; if not, document that they're independent by design.
- **Triage the 340 finding-less / 251 link-less sources** — either extract
  findings / add substance links so they become visible, or mark them so
  they're intentionally shelved rather than silently invisible.
- **Backfill `research_source_stacks`** (or confirm stacks aren't meant to
  carry sources yet).

---

_This audit made no code or data changes. Row counts are a point-in-time
snapshot of production._
