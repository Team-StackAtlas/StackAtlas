# Metabolic Health evidence base — batch 14 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-13 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs;
quotes verbatim from search output; E-utilities verification gates import.
Every PMID in this batch came from a returned PubMed URL or a
search-answer PMID statement cross-checked against matching titles —
none are memory-only.

**Why this batch:** Metabolic Health is the largest category and the
thinnest unstaged one by ratio (15 of 179 routed substances with
findings). Seven headliners, slugs DB-verified: cinnamon, inositol,
d-chiro-inositol, chromium, beta-hydroxy-beta-methylbutyrate,
conjugated-linoleic-acid, alpha-lipoic-acid.

Housekeeping in the same session (migration 20260817100000, applied to
prod): **alpha-lipoic-acid was not routed to Metabolic Health** despite
diabetic neuropathy and glycemia being its flagship evidence base (had
Longevity and Digestive Health). Same gap class as ashwagandha/CoQ10/
melatonin.

## Per-substance notes (quotes live in the pack rows)

1. **cinnamon** — the Allen 2013 updated meta (10 RCTs, n=543; PMID
   24019277): fasting glucose and lipids improve, HbA1c does not — staged
   `mixed` because that split IS the clinical story, with the high
   heterogeneity in limitations.
2. **inositol / d-chiro-inositol** — one source, two rows (PMID 38163998,
   the 2023 international PCOS guideline SR/MA, 30 trials n=2,230): the
   generic inositol row carries the some-metabolic-benefit-but-
   inconclusive verdict plus the fewer-GI-events-than-metformin note; the
   DCI row stages the ovulation signal at direction `unclear`, matching
   the guideline's own hedging.
3. **chromium** — Yin & Phung (14 RCTs, n=875; PMID 25971249) staged
   `no_clear_change`: the formulation-stratified analysis (chloride,
   picolinate, both yeasts) finds no HbA1c effect anywhere — a strong
   honest null for one of the most-marketed glycemia supplements.
4. **beta-hydroxy-beta-methylbutyrate** — Wu 2015 (7 RCTs; PMID 26169182):
   lean-mass preservation SMD 0.352, fat mass unchanged; small pooled n
   flagged.
5. **conjugated-linoleic-acid** — the 2009 FFM meta (18 trials; PMID
   19935864): +0.3 kg fat-free mass at p=0.05 with no dose-response, and
   the authors' own humans-respond-less-than-mice framing folded in.
   Staged `mixed`; the questionable-practical-relevance limitation is
   load-bearing.
6. **alpha-lipoic-acid** — Mijnhout 2012 (PMID 22331979): the IV-vs-oral
   split is the story — IV 600 mg/day clinically relevant (SMD -2.8),
   oral statistically-but-not-clinically significant. The limitation
   says plainly that the oral supplement form carries the weaker result.

## Flagged, not acted on

- **Omega-3 row cluster**: `omega-3-fatty-acids` (batches 8/10/11 staged
  rows), `epa-dha-omega-3-fatty-acids` (5 existing findings), and
  `docosahexaenoic-acid` + `alpha-linolenic-acid` all coexist. All have
  references, so none is a mergeable dupe — but which row is canonical
  for "fish oil" evidence is a modeling decision (same class as the
  vitamin-d umbrella question from batch 12). Owner call needed before
  more omega-3 rows are staged.
- `cinnamon` vs `ceylon-cinnamon`, `chromium` vs its two salt rows,
  `inositol` vs `d-chiro-inositol` (vs myo-inositol, which has no row):
  intentional element/form and isomer splits — left alone. Note the
  guideline evidence is mostly myo-inositol; if a `myo-inositol` row is
  ever added, the inositol row's findings should move there.

## Batch manifest

- substances covered: 7 (slugs DB-verified)
- sources: 6 (review_or_meta_analysis 6; 0 source-only)
- findings: 7 (mixed 4 · no_clear_change 1 · increased 1 · unclear 1)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. PMID 38163998's year is not asserted (2023 online / 2024 print
   ambiguity in search results) — verify script backfills.
3. The CLA row folds the same authors' prior fat-mass meta conclusion
   into the summary as context; the row's own source is the 2009 FFM
   meta. Verification should confirm the prior-meta phrasing appears in
   the 2009 abstract, else trim the clause.
4. Years asserted for 5 of 6 sources; verify script will catch mismatches.

## Coverage gaps (batch 15+)

- Remaining Metabolic Health headliners worth staging: banaba/coleus/
  benfotiamine (thinner evidence), betaine (body-comp meta is weak),
  green-tea/EGCG (routed Longevity only — route question first),
  apple-cider-vinegar (NOT in catalog — candidate addition alongside
  tart cherry), MCT oils (capric/caprylic rows exist).
- The GLP-1/SGLT2/statin Rx tail (semaglutide has rows already) —
  the standing Rx-framing policy question.
- Next thinnest unstaged categories after this: Performance (9/73),
  Hormonal Health (12/108), Pain & Injury (4/15).
