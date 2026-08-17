# Beauty & Skin evidence base — batch 6 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-5 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs;
quotes verbatim from search output; E-utilities verification gates import.

**Why this batch:** Beauty & Skin was the second-thinnest flagship category
(1 of 85 routed substances with findings). Six headliners, slugs
DB-verified: collagen-peptides (also given its missing Beauty & Skin route
by migration `20260817014500`), hyaluronic-acid, tretinoin, biotin,
azelaic-acid, retinol.

## Per-substance notes (quotes live in the pack rows)

1. **collagen-peptides** — the 2024 meta (26 RCTs, n=1,721; PMID 38192916):
   hydration and elasticity both improved; limitation notes the
   manufacturer-sponsorship pattern across this literature. The NMF
   mechanism trial (PMID 33774639) adds hydration-up but
   elasticity/thickness-unchanged — kept in the same row's limitations.
2. **hyaluronic-acid** — two oral 120 mg/day 12-week RCTs: n=150 (PMID
   41422283; hydration, elasticity, TEWL, periorbital wrinkle depth) and
   n=40 (PMID 34203487).
3. **tretinoin** — the classic multicenter vehicle-controlled result (79%
   vs 48% overall improvement; PMID 2024983) plus the concentration
   comparison (0.1% ≈ 0.025% efficacy, more irritation at 0.1%; PMID
   7544967) as a no_clear_change row on the between-dose endpoint.
4. **biotin** — the honest one: 2024 review (PMID 39148962) — no difference
   vs placebo in the best trial for hair growth in healthy people; benefit
   concentrated in deficiency states. Brittle-nail improvement at 2.5
   mg/day from the nail-health review (PMID 17763607) with its
   older-uncontrolled-studies caveat.
5. **azelaic-acid** — 2025 network meta (19 RCTs, n=8,208; PMID 40213532):
   20% azelaic acid tops investigator-assessed improvement in
   papulopustular rosacea (OR 8.54); vehicle-controlled lesion-count trial
   (73.4% vs 50.6% reduction; PMID 10598760).
6. **retinol** — the vehicle-controlled 0.4% lotion trial in naturally aged
   skin (n=36, mean age 87; PMID 17515510): fine wrinkling improved.

## Batch manifest

- substances covered: 6 (slugs DB-verified)
- sources: 11 (review_or_meta_analysis 4 · human_study 7; 0 source-only)
- findings: 12 (increased 7 · decreased 2 · no_clear_change 3)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. Topical dermatology results (tretinoin, azelaic-acid, retinol) are
   prescription/cosmetic treatment contexts — the rows say so; they should
   not read as supplement claims.
3. Years/journals null where unstated; verify script backfills.
4. PMID 41422283 is very recent — verify it is indexed and unretracted.

## Coverage gaps (batch 7+)

- Digestive Health (3/107) is the next thinnest flagship: probiotic
  strains, psyllium, glutamine, peppermint oil all carry strong metas.
- Ceramides (currently routed Metabolic Health only) may deserve a Beauty &
  Skin route review — oral ceramide skin-hydration RCTs exist.
- Niacinamide is absent from the catalog under that name — check for a
  synonym before any future pack references it.
