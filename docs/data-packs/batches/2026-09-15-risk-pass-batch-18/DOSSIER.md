# Interaction & risk evidence — batch 18 dossier (2026-09-15)

**Status: UNVERIFIED — do not import until the CI `research-verify` run
on this commit passes.**

Same provenance regime as batches 1-17 (see batch 1's provenance
statement): network-restricted session; PMIDs verbatim from returned
PubMed result URLs — every PMID in this batch came from a PubMed URL, none
from prose or memory (the lesson of batch 11/15's corrected PMIDs); quotes
verbatim from search output; the CI verify run gates import.

**Why this batch:** the second risk pass, closing the four items batch 11's
dossier queued: ginkgo bleeding risk, SJW+SSRI serotonin syndrome, red
yeast rice in pregnancy, and hawthorn's digoxin-immunoassay interference
(found in batch 11 with title-only provenance; now staged at abstract
level).

**Two-part delivery, with a difference from batch 11:**
1. This pack stages the evidence rows (4 sources / 4 findings).
2. Migration `20260915120000_risk_pass_2_health_risks.sql` adds four
   user-facing `health_risk` effects — **written but NOT applied to
   prod**. The Supabase MCP connection in this session failed with a
   `postgres` password-authentication error from mid-session onward while
   the project reported `ACTIVE_HEALTHY` (likely a rotated credential).
   The owner should apply the migration through the normal pipeline.

## Per-item notes

1. **ginkgo-biloba** — Kellermann & Kloft 2011 (18 RCTs, n=1,985; PMID
   21923430): an honest negative — no evidence of increased bleeding risk
   on hemostasis parameters. Staged `no_clear_change`; the limitation says
   plainly that the conventional anticoagulant caution rests on case
   reports, not this trial evidence. The health_risk effect row is written
   the same way — a caution with its evidentiary weight stated.
2. **st-john-s-wort** — the consultation-psychiatrist adverse-effects
   review (PMID 12832592): serotonin-syndrome risk with SSRIs as a
   pharmacodynamic interaction, explicitly distinguished from the CYP/P-gp
   rows in batch 11. ⚠ The sertraline/paroxetine case-series detail in the
   limitation comes from a 2025 European Psychiatry abstract surfaced in
   search output (no PMID, not staged as a source) — verification should
   confirm the review itself supports the summary; the SSRI-specific
   detail is confined to the limitation field.
3. **red-yeast-rice** — the 2019 medication-safety mini-review (PMID
   31118742): statin-class pregnancy/lactation contraindication with the
   animal-teratogenicity basis and reported in-utero exposure defects;
   the EFSA 10 mg/day concern and 3 mg/day severe-AE reports carried in
   limitations.
4. **hawthorn** — Dasgupta 2010 (PMID 20670141; `in_vitro_or_mechanistic`
   / `in_vitro`): platform-specific immunoassay interference (Abbott
   Digoxin III yes, Roche Tina-Quant no) plus a same-target
   pharmacodynamic signal in rat cardiomyocytes. Staged `mixed` and
   explicitly reconciled with batch 11's human PK null: the honest reading
   is "clinician awareness," not "demonstrated harm."

## Batch manifest

- substances covered: 4 (slugs previously DB-verified in batches 8-12)
- sources: 4 (review_or_meta_analysis 3 · in_vitro_or_mechanistic 1)
- findings: 4 (no_clear_change 1 · increased 2 · mixed 1)
- health_risk effects written (NOT applied): 4

## Uncertainty report

1. Unverified until the CI run on this commit passes.
2. ⚠ SJW row: SSRI-specific case-series detail sourced from an unstaged
   conference abstract — confined to `limitations`; see note 2 above.
3. The hawthorn row's "raised intracellular calcium" mechanism is from
   rat cardiomyocytes; the pack marks it `in_vitro` so it cannot be read
   as a human result.
4. Slugs were not re-verified live this session (DB connection down);
   all four were confirmed to exist in batches 8-12.

## Follow-ups

- Apply `20260915120000_risk_pass_2_health_risks.sql` once DB access is
  restored, then confirm one health_risk row per substance was added.
- Remaining risk candidates: bacopa/huperzine cholinergic interactions,
  magnesium chelation of bisphosphonates/antibiotics, kava + alcohol
  (hepatotoxic co-factors are already in kava's batch 11 effect row).
