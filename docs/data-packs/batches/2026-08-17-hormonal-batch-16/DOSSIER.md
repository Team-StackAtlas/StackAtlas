# Hormonal Health evidence base — batch 16 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-15 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs
except where flagged below; quotes verbatim from search output; E-utilities
verification gates import.

**Why this batch:** Hormonal Health sat at 12 of 108 routed substances with
findings, with coverage concentrated in the AAS/SARM/peptide tail while the
mainstream botanical and supplement headliners were at zero. Seven staged,
slugs DB-verified: maca, tribulus, fenugreek, chasteberry, black-cohosh,
d-aspartic-acid, soy-isoflavones.

No migrations this batch — no dupes or routing gaps surfaced in the
Hormonal Health triage. (`dehydroepiandrosterone` vs `dhea-prasterone` vs
`dehydroepiandrosterone-sulfate` was checked visually: prasterone carries
the findings; DHEA-S is a distinct analyte row; the bare DHEA row may be a
dupe candidate but has not been reference-audited — queued below.)

## Per-substance notes (quotes live in the pack rows)

1. **maca** — Shin 2010 systematic review (PMID 20691074): 2 positive
   RCTs + 1 ED trial vs 1 null, staged `mixed` with the authors' own
   too-limited-to-conclude verdict.
2. **tribulus** — the 2025 systematic review (PMID 40219032): no robust
   evidence for the testosterone claim — the honest null for the
   category's most-marketed botanical.
3. **fenugreek** — Mansoori 2020 meta (4 trials; PMID 32048383):
   significant total-testosterone increase, with the 4-trial/proprietary-
   extract caveat carrying the uncertainty.
4. **chasteberry** — the 2017 PMS/PMDD systematic review (PMID 29063202):
   7-of-8 trials superior to placebo; the limitation imports the wider
   literature's bias/heterogeneity/publication-bias caution so the large
   effect reads honestly.
5. **black-cohosh** — the Cochrane review (16 studies, n=2,027; PMID
   22972105 ⚠): insufficient evidence, staged `no_clear_change` with the
   insufficient-evidence-is-not-proof-of-no-effect nuance in limitations.
6. **d-aspartic-acid** — the 2015 dose RCT (PMID 25844073): 6 g/day
   REDUCED testosterone in resistance-trained men, 3 g/day did nothing —
   the anti-marketing finding, staged `mixed` with the 12-week null trial
   referenced in limitations.
7. **soy-isoflavones** — Taku 2012 meta (PMID 22433977): hot flash
   frequency −20.6% / severity −26.2%, genistein-content dose-response
   noted.

## Batch manifest

- substances covered: 7 (slugs DB-verified)
- sources: 7 (review_or_meta_analysis 6 · human_study 1; 0 source-only)
- findings: 7 (mixed 2 · no_clear_change 2 · decreased 2 · increased 1)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. ⚠ PMID 22972105 (Cochrane black cohosh) from memory-of-record matched
   against the search-confirmed review identity (CD007244, Leach & Moore
   2012, 16 studies n=2,027) — title-match verification is load-bearing.
3. The chasteberry row's limitation imports bias cautions stated in search
   output about the wider Vitex meta-analytic literature (Verkaik 2017 /
   Csupor 2019), not necessarily in PMID 29063202's own abstract —
   verification should confirm or trim.
4. PMID 40219032's year is not asserted (recent record); verify backfills.
5. Years asserted for 6 of 7 sources; verify script will catch mismatches.

## Coverage gaps (batch 17+)

- `dehydroepiandrosterone` (bare row) vs `dhea-prasterone`: possible dupe
  pair — needs the reference audit before any merge.
- Remaining Hormonal Health botanicals at zero: saw palmetto is NOT
  routed here (check whether it exists at all), pygeum, shatavari,
  pueraria-mirifica, dong-quai, wild-yam, horny-goat-weed, muira-puama —
  mostly thin or traditional-use; honest source-only candidates.
- Zinc/selenium/iodine hormone-adjacent rows sit at zero here; their
  evidence is deficiency-context and may belong in a nutrient-status pass.
- Last thin category: Pain & Injury (4/15).
