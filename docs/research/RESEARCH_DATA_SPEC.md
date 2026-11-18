# StackAtlas research data specification (v1)

One page: what a research batch is, what the backend does with each part,
and what "published" means. The validator (`supabase/functions/_shared/researchBatch.ts`)
is the source of truth for the rules; this is the human summary.

## 1. The unit of work: a batch

A batch is one JSON object sent to the `submit_research_batch` tool. It
carries an `idempotency_key` (resubmitting the same key returns the original
report and stages nothing) and up to four lists:

| List | Max rows | What it is |
| --- | --- | --- |
| `substance_updates` | 10 | A new `description`, `origin`, or `half_life` for an **existing** substance, by slug. Never creates substances. |
| `sources` | 40 | Bibliographic records: `title`, `source_type`, one of `pmid` / `doi` / `url`, `year`, and the substance slugs it is about. |
| `findings` | 60 | One measured result each: `substance_slug`, the source it came from (`source_pmid` / `source_doi` / `source_url`), `endpoint`, `direction`, `finding_summary`, optional `study_type`, `population`, dose, `duration`, `limitations`. |
| `glossary_terms` | 20 | `term`, `definition` (40–320 chars), optional `detail`, `category`, `tags`, `bearings` (≤5 from the site list). |

Enumerations are closed: `source_type` (10 values), `direction` (5),
`study_type` (9), `dose_unit` (6). Unknown values reject the row, not the batch.

## 2. What the server checks

Structural: envelope, limits, enums, required fields, identifier formats,
duplicates within the batch, references (a finding must cite a source in the
batch or already in the database; every slug must exist).

Editorial (descriptions and definitions): length, circular openers ("a form
of X", "X is a supplement"), claim language (cures, proven, best, boosts, no
side effects), vague "traditional use" with no stated use, unexplained jargon
(warning), near-identical to the current text (rejected), much shorter than
the current text (warning).

Bibliographic: every PMID is looked up on PubMed. The record must exist and
its title and year must roughly match what was submitted. A mismatch rejects
the source and every finding that cites it.

**What is not checked, by design:** whether the paper supports the finding,
whether the dose is right, whether the description is true. A valid citation
is not evidence of accuracy. The human reviewer is the scientific check.

## 3. Publication policy (what becomes public, and when)

| Part | On submit | On approve | On reject / revert |
| --- | --- | --- | --- |
| Sources | Staged as `unreviewed` and **visible** on the substance page as a bibliographic record (title, identifier, year, type). This is the only thing that goes public without a human, because it is a citation, not a claim. | Unchanged. | Removed with the batch. |
| Findings | Staged as `pending_review`; **not public**. | Flipped to `approved`; public on the substance page. | Removed with the batch. |
| Descriptions, origin, half-life | Held in the submission; **not applied**. | Applied, with the previous text saved to `substance_description_history`. | Previous text restored. |
| Glossary terms | Held in the submission; **not applied**. | Upserted, with the previous row saved. | Previous row restored, or the term deleted if it was new. |

Every submit, approve, reject, and revert writes a `moderation_log` row.
Approve and revert are owner-only; submit requires `site_admin` or
`site_owner` and runs as that user, so row-level security and the existing
RPC gates apply. The connector holds no service-role key.

## 4. Where it runs

- Connector: Supabase Edge Function `research-mcp` (MCP over HTTP, OAuth 2.1
  via Supabase Auth, consent page at `/oauth/consent` on the site).
- Storage and review: `research_submissions`, `substance_description_history`,
  and the existing `research_import_batches`, `research_sources`,
  `research_findings`, `glossary_terms`.
- Review UI: Admin → Research → Submissions. Manual file import stays under
  Advanced as a fallback only.
