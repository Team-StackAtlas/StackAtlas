# Digestive Health evidence base — batch 7 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-6 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs;
quotes verbatim from search output; E-utilities verification gates import.

**Why this batch:** Digestive Health was the next thinnest flagship category
(3 of 107 routed substances with findings; psyllium-husk already carried 5).
Seven headliners, slugs DB-verified: peppermint-oil,
saccharomyces-boulardii, lacticaseibacillus-rhamnosus-gg, ginger,
l-glutamine, inulin, limosilactobacillus-reuteri.

## Per-substance notes (quotes live in the pack rows)

1. **peppermint-oil** — the 2019 pooled meta (12 RCTs, n=835; PMID
   30654773): global symptoms RR 2.39 / NNT 3, abdominal pain RR 1.78 /
   NNT 4, adverse effects no different from placebo. Three atomic rows.
2. **saccharomyces-boulardii** — the 2005 AAD meta (17.2%→6.7%, one case
   prevented per ten; PMID 16128673) paired with the hospitalized-elderly
   null (PMID 22472744). ⚠ The null's population attribution came from
   summary prose; the row's limitations flag it for confirmation.
3. **lacticaseibacillus-rhamnosus-gg** — 22.4%→12.3% AAD reduction via the
   2017 review (PMID 28827186), with the child-only significance split as
   the limitation.
4. **ginger** — pregnancy meta (12 RCTs, n=1,278): nausea improved,
   vomiting episodes not, no abortion-risk signal (PMID 24642205); CINV
   review of 23 RCTs overall null with a low-dose subgroup benefit (PMID
   36501010, direction `mixed`).
5. **l-glutamine** — the striking postinfectious IBS-D RCT (79.6% vs 5.8%
   response; PMID 30108163) with a limitations note that the effect awaits
   replication, balanced against the 2024 permeability meta's overall null
   (PMID 39397201).
6. **inulin** — chronic-constipation meta (PMID 25208775) plus the recent
   12 g/day RCT (PMID 41233756) whose own pain/bloating null is kept in
   limitations.
7. **limosilactobacillus-reuteri** — the colic meta (6 RCTs, n=423; PMID
   26509502): ~45 min/day less crying at weeks 2-3, gone by week 4 —
   both rows staged so the time-course is honest.

## Batch manifest

- substances covered: 7 (slugs DB-verified)
- sources: 11 (review_or_meta_analysis 8 · human_study 3; 0 source-only)
- findings: 15 (decreased 5 · increased 4 · no_clear_change 5 · mixed 1)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. ⚠ PMID 22472744's elderly-population null needs confirmation against
   its abstract (flagged in the row).
3. The rhamnosus-GG numbers were quoted in a review's summary; the
   underlying meta is a separate publication — verification may prefer to
   re-anchor the finding there.
4. Years/journals null where unstated; verify script backfills.

## Coverage gaps (batch 8+)

- Bifidobacterium strains, acacia fiber, artichoke leaf, marshmallow root,
  slippery-elm — mostly thin or traditional-use evidence; a future pass
  should stage honest source-only rows where trials are absent.
- Remaining flagship thin spots after this batch: Cognition (6/98),
  Mood & Stress (4/53), Heart Health (4/31).
