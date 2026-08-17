# Interaction & risk evidence — batch 11 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-10 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs
except where flagged below; quotes verbatim from search output; E-utilities
verification gates import.

**Why this batch:** the dedicated risk pass queued in the batch 9 and 10
dossiers — user-requested 2026-08-17. Unlike batches 1-10 this is not
category-coverage work: each row is an interaction or risk caution that the
efficacy rows deliberately deferred.

**Two-part delivery:**
1. This pack stages the evidence rows (6 sources / 6 findings).
2. Migration `20260817071500` (applied to prod) surfaces five user-facing
   `health_risk` effects — SJW, 5-HTP, kava, red-yeast-rice, hawthorn —
   in the guduchi wording style, each traceable to a staged source. Kava's
   effect row cites the Teschke review already staged in batch 9 (PMID
   20720265), so it has no new pack row here.

## Per-item notes

1. **st-john-s-wort** — two rows: the classic interactions review (PMID
   12392581; CYP3A4/P-gp induction, transplant rejection on cyclosporine,
   OC failure) and the 2019/2020 revisit (PMID 31742659) with the
   hyperforin-content correlation as a `mixed` row — the limitation notes
   consumers can't usually act on it because labels don't declare
   hyperforin.
2. **5-hydroxy-l-tryptophan** — deliberately double-edged row (PMID
   16023217): no published human serotonin-syndrome cases attributed to
   5-HTP, AND the limitation carries the mechanistic risk + guidance
   against combining with SSRIs/MAOIs. Neither half stands without the
   other.
3. **red-yeast-rice** — the Cohen product analysis (PMID 28622038):
   monacolin K undetectable in 2 of 28 brands, >120-fold daily-dose range.
   `source_type: other` / `study_type: other` — it's a peer-reviewed
   chemical product analysis, not a human study.
4. **hawthorn** — the honest negative (PMID 12817526): no significant
   digoxin PK change in the n=8 crossover. Staged as `no_clear_change`
   because a narrow reassuring result is still a result; the effect row
   keeps the clinician-oversight caution.
5. **omega-3-fatty-acids** — the REDUCE-IT mineral-oil biomarker substudy
   (PMID 35762321 ⚠, DOI cross-check included): hsCRP +21.9%, oxLDL
   +10.9%, IL-1beta +28.9% in the comparator arm at 12 months; regulators
   estimated ~3% of net benefit attributable. `mixed`, with a limitation
   that this tempers rather than overturns the primary result. No
   health_risk effect row — it is trial nuance, not a substance risk.
6. **kava** — health_risk effect row only (evidence row is batch 9's
   hepatotoxicity `mixed` finding, PMID 20720265). Not re-staged here to
   avoid duplicate source rows at import time.

## Batch manifest

- substances covered: 5 in pack (6 with kava's effect-row-only entry)
- sources: 6 (review_or_meta_analysis 3 · human_study 2 · other 1)
- findings: 6 (mixed 3 · no_clear_change 2 · decreased 1)
- health_risk effects applied to prod: 5 (migration 20260817071500)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. ⚠ PMID 35762321 (REDUCE-IT biomarker substudy) came from search-answer
   prose; the DOI is included so the verify script cross-checks both.
3. ⚠ PMID 31742659's year was not asserted (search results showed both
   2019 and 2020 for the Br J Pharmacol paper) — verify script backfills.
4. The 5-HTP "no published cases" claim is a synthesis across the review
   and drug-information sources in the search output; verification should
   confirm the review supports it before import.
5. The ACMT-position-statement claim from search output (2019, concurrent
   use contraindicated) was NOT included in any row — it could not be
   anchored to a primary source in this session. A future pass may add it
   with proper sourcing.
6. Hawthorn's immunoassay-interference signal (PMID 20670141) was found
   but NOT staged — only its title was available in search output. Queued
   for a future pass with abstract-level sourcing.

## Coverage gaps (future risk passes)

- RYR: pregnancy contraindication (statin class) — needs a citable source.
- SJW: serotonin syndrome with SSRIs (distinct from the PK interactions).
- Ginkgo: bleeding risk with anticoagulants; bacopa/huperzine cholinergic
  interactions; magnesium + bisphosphonate/antibiotic chelation.
- The Rx-framing policy question (batches 8-10) remains open.
