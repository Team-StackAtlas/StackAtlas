# Pain & Injury evidence base — batch 17 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-16 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs
except where flagged below; quotes verbatim from search output; E-utilities
verification gates import.

**Why this batch:** Pain & Injury was the last thin category (4 of 15
routed substances with findings — and two of those are SARM rows). Six
headliners staged, slugs DB-verified: capsaicin, devil-s-claw,
white-willow-bark, turmeric, riboflavin, magnesium.

**With batch 17, every category in the catalog has a staged evidence
base.**

Housekeeping in the same session (migration 20260817110000, applied to
prod): merged importer-era dupe `dehydroepiandrosterone` →
`dhea-prasterone` (canonical: 5 sources/5 findings, alias already
included "dehydroepiandrosterone"; dupe zero-reference). The audit
queued in batch 16's dossier is thereby closed; `dehydroepiandrosterone-
sulfate` (DHEA-S) is a distinct analyte row and was left alone.

## Per-substance notes (quotes live in the pack rows)

1. **capsaicin** — the Derry Cochrane review (PMID 28085183): 8% patch,
   PHN NNT ~8.8, similar-to-other-therapies framing. The limitation
   separates the clinician-applied patch evidence from OTC creams.
2. **devil-s-claw / white-willow-bark** — one Cochrane source (PMID
   16625605), two rows: strong evidence for harpagoside 50/100 mg,
   moderate for salicin 120/240 mg, both short-term-only with the
   no-long-term-safety caveat; willow's aspirin-family caution noted.
3. **turmeric** — the 2022 arthritis meta (29 RCTs, n=2,396; PMID
   35935936): pain/function/stiffness improved, NSAID-comparable in
   head-to-heads, low-quality caveat carried. Staged on the whole-extract
   `turmeric` row; the existing `curcumin` rows cover the isolated
   compound.
4. **riboflavin** — the Schoenen 1998 RCT (n=55, 400 mg/day; PMID
   9484373): NNT 2.3 for ≥50% improvement — one of supplement science's
   best NNTs, from one small trial, and the limitation says exactly that.
5. **magnesium** — the Chiu 2016 meta (PMID 26752497 ⚠): oral magnesium
   reduced migraine frequency/intensity; randomization-quality caveat.
   Complements the batch 10 blood-pressure row.

## Batch manifest

- substances covered: 6 (slugs DB-verified)
- sources: 5 (review_or_meta_analysis 4 · human_study 1; 0 source-only)
- findings: 6 (decreased 6 — an unusually positive batch, but every row
  carries its scope limit: short-term-only, single-trial, NNT reality,
  or quality caveat)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. ⚠ PMID 26752497 (Chiu magnesium/migraine meta) from memory-of-record
   matched against the search-confirmed journal/year/content — title-match
   verification is load-bearing.
3. The herbal LBP rows cite the 2006 Cochrane version (PMID 16625605, the
   URL-confirmed record); a 2016 Spine re-publication (PMID 26630428)
   exists — verification may prefer to re-anchor there.
4. The capsaicin NNT (8.8) and framing quotes were relayed via secondary
   descriptions of the Cochrane review in search output — confirm against
   the abstract.
5. Years asserted for all 5 sources; verify script will catch mismatches.

## Coverage state after batch 17

Every category now has a staged evidence base. Remaining structural work,
in rough priority order:

1. **Import gate**: run `verify-pack.mjs` for batches 1-17 in a
   network-enabled session, then import via Admin → Research.
2. **Owner decisions**: vitamin-d umbrella; omega-3 row cluster; Rx-tail
   framing; SAMe Mood & Stress route.
3. **Candidate catalog additions**: tart cherry, apple cider vinegar,
   myo-inositol (would inherit the inositol findings).
4. **Future risk items**: RYR pregnancy, SJW+SSRI serotonin syndrome,
   ginkgo bleeding risk, hawthorn immunoassay interference.
5. **Source-only passes** for traditional-use botanicals with no trials
   (turkesterone, fadogia, shatavari, muira-puama…).
