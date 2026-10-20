# Cognition evidence base — batch 8 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-7 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs
except where flagged below; quotes verbatim from search output; E-utilities
verification gates import.

**Why this batch:** Cognition was the thinnest flagship category by far
(6 of ~96 routed substances with findings, all clustered on the choline/
herbal veterans). Seven zero-coverage headliners, slugs DB-verified:
lion-s-mane-mushroom, huperzine-a, acetyl-l-carnitine, l-tyrosine,
omega-3-fatty-acids, piracetam, magnesium-l-threonate.

Housekeeping in the same session (separate migration, already applied to
prod): merged importer-era synonym duplicates `bacopa` → `bacopa-monnieri`
and `ginkgo` → `ginkgo-biloba` (20260817031000).

## Per-substance notes (quotes live in the pack rows)

1. **lion-s-mane-mushroom** — the Mori 2009 MCI RCT (n=30, 16 weeks, 3 g/day
   dry powder; PMID 18844328): cognitive scale up at weeks 8-16, no lab
   adverse effects. One honest row; the n=30 limitation is carried.
2. **huperzine-a** — the 2013 PLoS ONE meta (20 RCTs, n=1,823; PMID
   24086396): MMSE and ADL both favor huperzine A, but the authors' own
   high-risk-of-bias warning is stamped on both rows.
3. **acetyl-l-carnitine** — the Montgomery 2003 positive meta (PMID
   12598816) deliberately paired with the Cochrane review's `mixed` row
   (PMID 12804452): global impression benefit, objective-outcome null,
   may-be-chance caveat.
4. **l-tyrosine** — Jongkees 2015 review (PMID 26424423): effective under
   acute stress/cognitive demand when catecholamines are depleted; clinical
   treatment potential judged limited — two rows so the boundary is explicit.
5. **omega-3-fatty-acids** — the honest trio: Cochrane prevention null in
   healthy 60+ (PMID 22696350), MIDAS episodic-memory positive at 900 mg/day
   DHA (PMID 20434961), Quinn Alzheimer's null at 2 g/day (PMID 21045096).
   Together they sketch the stage-dependence story without editorializing.
6. **piracetam** — Waegemans 2002 global-impression positive (PMID 12006732)
   against the 2024 memory-endpoint null (SMD 0.75, CI crosses zero,
   I²=96%; PMID 38878641). The old-meta/new-meta tension is the point.
7. **magnesium-l-threonate** — the MMFS-01 RCT (PMID 26519439): composite
   cognition d=0.91 at 12 weeks, with developer-run-trial and
   derived-brain-age caveats in limitations.

## Batch manifest

- substances covered: 7 (slugs DB-verified)
- sources: 11 (review_or_meta_analysis 7 · human_study 4; 0 source-only)
- findings: 13 (increased 7 · no_clear_change 4 · mixed 1 · decreased 0)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. ⚠ PMID 12598816 (Montgomery ALCAR meta) came from DARE summary prose,
   not a direct PubMed result URL — title-match check is load-bearing here.
3. ⚠ PMID 20434961 (MIDAS) was confirmed by a search answer to a direct
   PMID query rather than a returned PubMed URL — same caveat.
4. The lion's mane dose framing (four 250 mg tablets three times daily)
   comes from search prose; verify against the abstract.
5. Years asserted for all 11 sources; verify script will catch mismatches.

## Coverage gaps (batch 9+)

- Remaining Cognition zero-coverage names worth staging: creatine-adjacent
  cognition work, l-theanine+caffeine combos (check existing rows first),
  vinpocetine (Cochrane inconclusive), thiamine/B12/B6 (mostly nulls in
  non-deficient populations), vitamin-e (ADCS trial), gotu-kola, dmae.
- The prescription tail (donepezil, memantine, methylphenidate…) is a
  policy question — findings would be legitimate but the catalog's framing
  for Rx compounds should be decided before staging them.
- Remaining flagship thin spots after this batch: Mood & Stress (4/53),
  Heart Health (4/31).
