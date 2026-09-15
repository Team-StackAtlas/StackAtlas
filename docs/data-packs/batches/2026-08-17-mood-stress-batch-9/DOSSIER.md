# Mood & Stress evidence base — batch 9 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-8 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs
except where flagged below; quotes verbatim from search output; E-utilities
verification gates import.

**Why this batch:** Mood & Stress was the next thinnest flagship (5 of 53
routed substances with findings). Six zero-coverage headliners, slugs
DB-verified: st-john-s-wort, kava, 5-hydroxy-l-tryptophan, lemon-balm,
holy-basil, kanna.

Housekeeping in the same session (separate migration, already applied to
prod): **ashwagandha had zero category routes** despite 4 findings and 12
catalog references — invisible in every category browse, the same routing
gap collagen-peptides had before batch 6. Migration 20260817054500 adds
its flagship Mood & Stress route.

## Per-substance notes (quotes live in the pack rows)

1. **st-john-s-wort** — the 2008 Cochrane meta (29 trials, n=5,489; PMID
   18843608): superior to placebo, comparable to standard antidepressants,
   fewer side effects. Two rows, with the German-speaking-countries
   heterogeneity and preparation-variability caveats. ⚠ The tolerability
   row explicitly notes it does NOT capture SJW's CYP-mediated drug
   interactions — that needs a dedicated risk row in a future risk pass
   (not sourced in this session's search output, so not staged).
2. **kava** — the Cochrane anxiety meta (7 trials, HAM-A significant; PMID
   12535473) deliberately paired with the Teschke hepatotoxicity clinical
   review (PMID 20720265) as a `mixed` risk row: ~78 case reports, the
   2002-03 EU/Canada bans and FDA advisory, the weak causality assessments,
   and the German court reversal — all in one honest row.
3. **5-hydroxy-l-tryptophan** — the 2002 Cochrane (PMID 11869656): Peto OR
   4.10 for depression, but only 2 of 108 located studies were includable
   (n=64). The positive direction is kept faithful to the OR; the
   limitations carry the authors' own insufficient-quality verdict.
4. **lemon-balm** — the 2021 Phytother Res meta (6 rigorous trials, n=435;
   PMID 34449930): SMD −0.98 on anxiety/depression scores, high
   heterogeneity flagged.
5. **holy-basil** — the Jamshidi/Cohen 2017 systematic review (24 human
   studies; PMID 28400848) plus the 2022 Holixer RCT (n=100, 250 mg/day,
   8 weeks; PMID 36185698): PSS and sleep improved, hair cortisol down,
   buffered acute-stressor response. Proprietary-extract caveat on both
   RCT rows.
6. **kanna** — the Reay 2020 Zembrin acute studies (PMID 32761980): single
   25 mg dose lowered subjective lab-stress anxiety in study 2; the row's
   limitations note study 1's outcomes were not reported as significant.

**Deliberately left alone:** `kanna` vs `kanna-mesembrine-extract` looks
like an intentional whole-herb/standardized-extract split (no cross-naming
aliases, both zero-reference) — not an importer dupe; findings staged on
the whole-herb row where the trial used a standardized extract are noted
as such in the row text.

## Batch manifest

- substances covered: 6 (slugs DB-verified)
- sources: 8 (review_or_meta_analysis 6 · human_study 2; 0 source-only)
- findings: 10 (decreased 6 · increased 3 · mixed 1 · no_clear_change 0)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. ⚠ PMID 34449930 (lemon balm meta) and PMID 28400848 (tulsi review) came
   from search-answer prose rather than returned PubMed URLs — title-match
   verification is load-bearing for both.
3. The kava hepatotoxicity row compresses a contested literature; the
   Teschke review is kava-sympathetic, so the row keeps the ban history and
   transplant/death case counts in view alongside the causality critique.
4. SJW drug-interaction risk is a known coverage gap (see note above).
5. Years asserted for all 8 sources; verify script will catch mismatches.

## Coverage gaps (batch 10+)

- Remaining Mood & Stress zero-coverage names worth staging: eleuthero,
  schisandra, astragalus, holy-basil's Ayurvedic siblings, lithium-orotate
  (evidence nearly absent — likely a source-only or honest-null candidate),
  dl-phenylalanine, damiana (traditional-use only).
- The Rx/benzodiazepine tail (alprazolam, diazepam, mirtazapine…) is the
  same policy question flagged in batch 8 — decide catalog framing before
  staging prescription psychotropics.
- A dedicated risk pass should stage: SJW CYP interactions, 5-HTP + SSRI
  serotonin-syndrome caution, kava + alcohol/hepatotoxic co-medication.
- Remaining flagship thin spot after this batch: Heart Health (4/31).
