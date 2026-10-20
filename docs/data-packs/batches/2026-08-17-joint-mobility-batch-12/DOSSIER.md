# Joint & Mobility evidence base — batch 12 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-11 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs
except where flagged below; quotes verbatim from search output; E-utilities
verification gates import.

**Why this batch:** with the flagship categories staged (batches 1-11),
Joint & Mobility was the thinnest remaining category with no staged batch
(3 of 28 routed substances with findings — vitamin D3, glycine, curcumin).
Seven headliners, slugs DB-verified: glucosamine-sulfate,
glucosamine-hydrochloride, chondroitin-sulfate, methylsulfonylmethane,
boswellia, undenatured-type-ii-collagen, s-adenosyl-l-methionine.

Housekeeping in the same session (migration 20260817080000, applied to
prod):
- Merged importer-era dupe `cholecalciferol` → `cholecalciferol-vitamin-d3`
  (zero-reference dupe; canonical already aliased "cholecalciferol").
- Added the Joint & Mobility route to boswellia, methylsulfonylmethane,
  s-adenosyl-l-methionine, and hyaluronic-acid — all four have joint/OA as
  a flagship use but weren't routed (same gap class as collagen-peptides/
  ashwagandha/CoQ10).

**Flagged, not acted on:** `vitamin-d` (the D2+D3 umbrella row, with real
references) coexists with `cholecalciferol-vitamin-d3`, whose aliases
include "Vitamin D" and "vitamin-d" — so umbrella-name lookups resolve to
the D3 row while a distinct umbrella row also exists. Whether to keep an
umbrella row, and who owns the "Vitamin D" alias, is a modeling decision
for the owner — not an importer dupe. `ergocalciferol` (D2) is legit.
SAMe also has strong depression evidence; a Mood & Stress route + rows
would be a reasonable future addition (not staged here — out of category
scope).

## Per-substance notes (quotes live in the pack rows)

1. **glucosamine-hydrochloride / chondroitin-sulfate** — the GAIT trial
   (n=1,583, placebo- and celecoxib-controlled; PMID 16495392): overall
   null for both, with the exploratory moderate-to-severe-subgroup signal
   and the HCl-vs-sulfate distinction kept in limitations.
2. **glucosamine-sulfate** — the 2005 Cochrane update (25 studies,
   n=4,963; PMID 15846645) staged `mixed`: Rotta-preparation function
   benefit vs no pain benefit in adequately-concealed trials. The
   preparation-specificity IS the story.
3. **chondroitin-sulfate** — the 2015 Cochrane (PMID 25629804): slight
   short-term pain benefit, slight joint-space-narrowing slowing, low
   evidence quality — deliberately paired with GAIT's null.
4. **methylsulfonylmethane** — treatment/prevention split: the pilot RCT
   positive (6 g/day, 12 weeks; PMID 16309928) beside the military-trainee
   prevention null (3 g/day; PMID 29214616).
5. **boswellia** — the 2020 meta (7 trials, n=545; PMID 32680575 ⚠):
   pain/stiffness improved; heterogeneous extracts flagged.
6. **undenatured-type-ii-collagen** — Lugo 2016 (n=191, 40 mg/day beats
   placebo AND glucosamine+chondroitin; PMID 26822714 ⚠) plus the 2009
   two-site trial (PMID 19847319); proprietary-ingredient caveat on both.
7. **s-adenosyl-l-methionine** — Soeken 2002 meta (PMID 12019049) staged
   `mixed`: function significant, pain not, NSAID-comparable with better
   tolerability — and the later Cochrane inconclusive verdict in
   limitations.

## Batch manifest

- substances covered: 7 (slugs DB-verified)
- sources: 9 (human_study 5 · review_or_meta_analysis 4; 0 source-only)
- findings: 10 (decreased 5 · no_clear_change 3 · mixed 2)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. ⚠ PMID 32680575 (boswellia meta) and PMID 26822714 (Lugo UC-II) came
   from memory-of-record matched against search-confirmed titles/DOIs, not
   returned PubMed URLs — both carry DOIs so the verify script
   cross-checks; title-match is load-bearing.
3. The Kim MSM pilot year (2006) and military-trainee trial year were not
   asserted where search output didn't state them; verify backfills.
4. GAIT dose rows (1,500 mg glucosamine HCl / 1,200 mg chondroitin daily)
   come from the trial's well-known arms as echoed in search output.
5. Years asserted for 7 of 9 sources; verify script will catch mismatches.

## Coverage gaps (batch 13+)

- Remaining Joint & Mobility zero-coverage names: hyaluronic-acid (oral,
  now routed — knee OA RCTs exist), boron, silicon, gelatin (+ vitamin C
  pre-exercise collagen-synthesis protocol), calcium forms, menaquinones
  (bone rather than joint — may belong in a future Bone pass with
  vitamin-k/calcium), tb-500/thymosin-beta-4 (preclinical only — honest
  source-only candidates).
- Next thinnest unstaged categories: Recovery (4/47), Metabolic Health
  (15/179), Performance (9/73), Hormonal Health (12/108).
- The vitamin-d umbrella/alias question above needs an owner decision.
