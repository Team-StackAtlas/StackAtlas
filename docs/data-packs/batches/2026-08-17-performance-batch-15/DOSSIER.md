# Performance evidence base — batch 15 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-14 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs
except where flagged below; quotes verbatim from search output; E-utilities
verification gates import.

**Why this batch:** Performance sat at 9 of 73 routed substances with
findings — and the covered rows are dominated by the AAS/SARM tail
(LGD-4033, ostarine, nandrolone…), while the mainstream supplement
headliners were all at zero. Five supplement headliners plus one
gray-market compound staged, slugs DB-verified: nitrate, whey-protein,
citrulline-malate, branched-chain-amino-acids, ibutamoren.

No migrations this batch — no dupes or routing gaps surfaced in the
Performance triage (creatine was already fixed in batch 13's migration).

## Per-substance notes (quotes live in the pack rows)

1. **nitrate** — the 2021 JISSN meta (PMID 34243756): time-to-exhaustion
   improves, dose-and-duration threshold (≥6 mmol/day, >3 days), VO2 cost
   down with VO2max unchanged. Beetroot-juice-as-vehicle noted; a
   beetroot-extract-specific row was NOT staged (the Domínguez 2017
   review surfaced with mechanism prose only — queued for a future pass
   with abstract-level results).
2. **whey-protein** — Morton's 49-study meta (PMID 28698222): +2.49 kg
   1RM, +0.30 kg FFM, +310 um2 fibre CSA; the row is explicit that the
   meta covers protein supplementation broadly with whey as the dominant
   supplement, and that the benefit shrinks with age. The famous
   ~1.6 g/kg/day plateau was NOT included — it did not appear in this
   session's search output.
3. **citrulline-malate** — the Varvik/Bjornsen/Gonzalez 2021 meta (PMID
   33714183 ⚠, DOI cross-check): +3 reps to failure (6.4%), Hedges g
   0.196 — staged as increased with the small-effect limitation doing
   the honest work.
4. **branched-chain-amino-acids** — the chronic/acute split as two rows:
   training-context DOMS reduction (ES 0.73; PMID 30938579) beside the
   single-bout null (CK down, soreness unchanged; PMID 34669012 ⚠
   attribution flag). The first row's limitation heads off the
   BCAA-builds-muscle misread.
5. **ibutamoren** — the Nass 2008 Annals RCT (PMID 18981485): GH/IGF-1
   restored to young-adult range, FFM +1.6 kg, and no strength or
   function improvement — `mixed`, with the investigational-compound and
   safety-unestablished caveats. Harm-reduction value: this is the one
   published long-duration human RCT for a widely used gray-market
   compound.

## Batch manifest

- substances covered: 5 (slugs DB-verified)
- sources: 6 (review_or_meta_analysis 5 · human_study 1; 0 source-only)
- findings: 6 (increased 3 · decreased 1 · no_clear_change 1 · mixed 1)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. ⚠ PMID 33714183 (citrulline-malate meta) from memory-of-record matched
   against the search-confirmed title/journal/DOI; DOI included so the
   verify script cross-checks.
3. ⚠ The BCAA single-bout row attributes the soreness-null conclusion to
   PMID 34669012 based on context in search output; the row's own
   limitations flag this for confirmation against the abstract.
4. Morton meta year (2018) not asserted (correction notice in results
   created ambiguity); verify script backfills.
5. Years asserted for 4 of 6 sources; verify script will catch mismatches.

## Coverage gaps (batch 16+)

- Performance names left at zero worth staging later: beetroot-extract
  (with abstract-level results), l-carnitine (performance/recovery metas
  are modest), cordyceps (thin RCTs), d-ribose, guanidinoacetic-acid,
  turkesterone (no human RCTs — source-only candidate), carnosine/anserine.
- The AAS/SARM tail largely has findings already; remaining zeros there
  (stanozolol, oxymetholone, trenbolone esters…) are the standing
  Rx/gray-framing policy question.
- Next thinnest unstaged categories: Hormonal Health (12/108),
  Pain & Injury (4/15).
