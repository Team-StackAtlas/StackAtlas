# Recovery evidence base — batch 13 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-12 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs
except where flagged below; quotes verbatim from search output; E-utilities
verification gates import.

**Why this batch:** Recovery was the thinnest remaining unstaged category
(4 of 47 routed substances with findings, and the roster is sleep/rest-
heavy). Seven headliners staged, slugs DB-verified: valerian, lavender,
chamomile, passionflower, l-tryptophan, beta-alanine,
gamma-aminobutyric-acid.

Housekeeping in the same session (migration 20260817090000, applied to
prod) — the biggest routing-gap haul yet, all found because coverage
triage asked "where is melatonin?":
- **Four substances had findings but ZERO routes**: melatonin (5 findings),
  l-theanine (6), creatine-monohydrate (4), magnesium-glycinate (4) —
  same importer gap class as ashwagandha. Routed: melatonin → Recovery,
  l-theanine → Mood & Stress, magnesium-glycinate → Recovery.
- **Merged importer dupe `creatine` → `creatine-monohydrate`** (canonical:
  7 sources, 9 refs, aliases already included "creatine"; dupe zero-ref).
  New wrinkle handled: the canonical had no routes while the dupe carried
  Metabolic Health + Performance, so routes were TRANSFERRED before the
  dupe row was deleted.

Melatonin already carries 5 findings, so the route fix alone restores it
to visibility — no new melatonin rows staged.

## Per-substance notes (quotes live in the pack rows)

1. **valerian** — Bent 2006 meta (16 studies, n=1,093; PMID 17145239 ⚠)
   staged `mixed`: subjective improvement claim, 9-of-16-negative reality,
   and the authors' own may-not-be-reliable verdict all in one row.
2. **lavender** — the Silexan pairing: 2016 updated meta (PMID 27861196)
   plus the 2014 four-arm GAD trial (n=539; HAMA −14.1 on 160 mg vs −11.3
   paroxetine vs −9.5 placebo; PMID 24456909 ⚠). Both rows carry the
   Silexan-specificity caveat — this is not aromatherapy evidence.
3. **chamomile** — the Amsterdam 2009 RCT (n=57; PMID 19593179). The
   long-term 2016 relapse-prevention trial (PMID 27912875) was found but
   NOT staged — search output gave its design, not its results.
4. **passionflower** — Ngan & Conduit tea study (n=41, 7 days; PMID
   21294203): honest low-dose short-term framing.
5. **l-tryptophan** — the 2022 Nutr Rev meta (PMID 33942088) staged
   `mixed`: wake-after-sleep-onset improves (≥1 g), sleep-onset latency
   does not — the sleep-maintenance vs sleep-onset split is the story.
6. **beta-alanine** — Hobson 2012 (PMID 22270875 ⚠, DOI cross-check):
   capacity yes (2.85%, 60-240 s efforts), performance measures no.
7. **gamma-aminobutyric-acid** — the 2020 systematic review (PMID
   33041752) staged with direction `unclear` — the first use of that
   direction in the evidence base, and exactly what the review supports:
   limited evidence for stress, very limited for sleep.

## Batch manifest

- substances covered: 7 (slugs DB-verified) + melatonin route-only repair
- sources: 8 (review_or_meta_analysis 5 · human_study 3; 0 source-only)
- findings: 8 (decreased 4 · mixed 3 · unclear 1)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. ⚠ PMID 17145239 (Bent valerian) confirmed via search-answer prose, not
   a returned PubMed URL.
3. ⚠ PMID 24456909 (Kasper 2014 Silexan GAD trial) appeared as a bare
   PubMed link among results for the matching query — attribution is
   high-confidence but title-match verification is load-bearing.
4. ⚠ PMID 22270875 (Hobson beta-alanine) from memory-of-record matched
   against the search-confirmed journal/year/DOI; DOI included.
5. Years asserted for all 8 sources; verify script will catch mismatches.

## Coverage gaps (batch 14+)

- Remaining Recovery zero-coverage names: gaba-adjacent botanicals
  (magnolia-bark, apigenin), cordyceps, lemon-balm (already covered in
  batch 9 — routes may warrant a Recovery addition), tart cherry (NOT in
  catalog at all — a candidate substance to add, with jet-lag/DOMS RCT
  evidence), glycine already covered.
- The Rx hypnotic tail (zolpidem, suvorexant, benzodiazepines…) is the
  same catalog-framing policy question flagged since batch 8.
- Next thinnest unstaged categories: Metabolic Health (15/179),
  Performance (9/73), Hormonal Health (12/108), Pain & Injury (4/15).
