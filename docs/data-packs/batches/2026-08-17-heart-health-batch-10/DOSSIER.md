# Heart Health evidence base — batch 10 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-9 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs
except where flagged below; quotes verbatim from search output; E-utilities
verification gates import.

**Why this batch:** Heart Health was the last flagship thin spot (4 of 31
routed substances with findings — and one of those is nandrolone's
cardiotoxicity rows). Seven headliners, slugs DB-verified: red-yeast-rice,
garlic, omega-3-fatty-acids (cardiovascular sources — its cognition rows
are batch 8), coenzyme-q10, hawthorn, plant-sterol-esters, magnesium.

Housekeeping in the same session (separate migration, already applied to
prod): **coenzyme-q10 was routed to Mood & Stress, Metabolic Health, and
Longevity but not Heart Health** — its flagship indication. Migration
20260817063000 adds the route (same gap class as collagen-peptides and
ashwagandha).

## Per-substance notes (quotes live in the pack rows)

1. **red-yeast-rice** — the 2022 meta of 15 high-quality RCTs (PMID
   35111069): LDL −1.02 mmol/L, statin-comparable; paired with its own
   safety row whose limitation carries the authors' judgment that AE
   reporting was too weak for firm conclusions. The monacolin-K-is-
   lovastatin fact is in the LDL row's limitations.
2. **garlic** — Ried's 2016 updated meta (20 trials, n=970; PMID
   26764326): −5.1/−2.5 mmHg in hypertensives, with the rival reviews'
   evidence-not-strong verdict as the limitation.
3. **omega-3-fatty-acids** — the CV pairing: REDUCE-IT (4 g/day purified
   EPA, HR 0.75; PMID 30415628 ⚠) beside the 2018 Cochrane null for
   supplemental EPA+DHA (86 trials, n=162,796; PMID 30019766). The
   REDUCE-IT row's limitation is explicit that prescription icosapent
   ethyl results do not generalize to OTC fish oil.
4. **coenzyme-q10** — Q-SYMBIO (n=420, 100 mg tid, 2 years; PMID 25282031
   ⚠): MACE halved (HR 0.50), CV and all-cause mortality HR 0.51 — two
   rows, both carrying the small-trial/no-confirmatory-trial caveat.
5. **hawthorn** — the 2003 meta (8 trials, n=632, NYHA I-III; PMID
   12798455): +7 W maximal workload, dyspnea/fatigue improved; adjunct
   framing and no-event-outcomes limitation.
6. **plant-sterol-esters** — the Musa-Veloso dose-range meta (PMID
   21345662): comparable dose-response to 3 g/day, sterol-ester maximum
   ~8.4% vs stanol-ester ~17.1% — the surrogate-endpoint limitation is
   load-bearing (no CV outcome trials exist).
7. **magnesium** — Zhang 2016 Hypertension meta (34 trials, n=2,028;
   PMID 27402922 ⚠): −2.00/−1.78 mmHg at median 368 mg/day.

**Deliberately left alone:** `monacolin-k` vs `red-yeast-rice` and
`aged-garlic-extract` vs `garlic` are intentional compound/whole-product
splits (same pattern as kanna) — not importer dupes. Findings staged on
the whole-product rows.

## Batch manifest

- substances covered: 7 (slugs DB-verified)
- sources: 8 (review_or_meta_analysis 6 · human_study 2; 0 source-only)
- findings: 10 (decreased 7 · increased 1 · no_clear_change 2 · mixed 0)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. ⚠ Three PMIDs were confirmed via search-answer prose or DOI rather than
   returned PubMed URLs: 30415628 (REDUCE-IT), 25282031 (Q-SYMBIO), and
   27402922 (Zhang magnesium meta). All three carry DOIs in the pack so
   the verify script cross-checks both identifiers; title-match is
   load-bearing.
3. The REDUCE-IT mineral-oil-placebo controversy is not captured (not in
   this session's search output) — a future risk/nuance pass could add it.
4. Q-SYMBIO's NYHA population is described as moderate-to-severe; search
   snippets varied between III and III-IV — verify against the abstract.
5. Years asserted for all 8 sources; verify script will catch mismatches.

## Coverage gaps (batch 11+)

- Remaining Heart Health zero-coverage names worth staging: potassium
  (Aburto 2013 BMJ meta — BP/stroke), l-arginine and citrulline (BP
  metas), folate/B12 (homocysteine story — mostly null outcome trials,
  honest nulls), vitamin-e (null/harm signal in outcome trials),
  policosanol (the Cuban-trials replication failure is itself a good
  honest row), danshen, olive-leaf, hydroxytyrosol.
- With batch 10, every flagship category has a staged evidence base;
  the next structural pass could be the dedicated risk pass flagged in
  batch 9 (SJW interactions, 5-HTP+SSRI, kava co-medication, RYR+statin
  duplication, hawthorn+digoxin).
