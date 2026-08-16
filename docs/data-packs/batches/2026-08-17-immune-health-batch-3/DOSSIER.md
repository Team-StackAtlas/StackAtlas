# Immune Health evidence base — batch 3 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-2 (see batch 1's provenance statement):
network-restricted session, PMIDs copied verbatim from returned PubMed result
URLs, quotes verbatim from search output, E-utilities verification required
before import.

**Scope:** the 7 substances newly routed to Vitality / Immune Health by
migration `20260816231500` — echinacea, elderberry, zinc, zinc-gluconate,
astragalus, beta-glucans, turkey-tail. All slugs were verified against the
live catalog this session (DB access was restored), and all seven had **zero
research findings** before this batch.

---

## 1. echinacea

- **PMID 24554461** — Cochrane 2014 (DOI 10.1002/14651858.CD000530.pub3).
  Quotes: "Twenty-four double-blind trials with 4,631 participants including
  33 comparisons of echinacea preparations and placebo" · "Echinacea products
  have not been shown to provide benefits for treating colds, although, it is
  possible there is a weak benefit from some Echinacea products" · "None of
  the 12 prevention comparisons reporting the number of patients with at
  least one cold episode found a statistically significant difference.
  However a post hoc pooling of their results, suggests a relative risk
  reduction of 10% to 20%."
  → findings: treatment benefit (no_clear_change), prevention (mixed).
- **PMID 33832544** — children antibiotic-usage RCT. Title-level result
  (title asserts the reduction); flagged in `limitations`.
- **URL PMC3457740** — Jawad 2012 prevention RCT. ⚠ The quoted positive
  sentence ("reduced the total number of cold episodes, cumulated episode
  days ... pain-killer medicated episodes") appeared in search summary prose;
  its attribution to this trial matches the trial's known design but MUST be
  confirmed during verification — the finding row says so.
- **PMID 40311928** — 2025 children URTI/otitis meta. Source-only.

**Evidence quality:** deep but honest picture — the strongest synthesis
(Cochrane) is null-to-weak, and it leads the substance's findings list.

## 2. elderberry

- **PMID 30670267** — 2019 meta-analysis. Quote: "supplementation with
  elderberry substantially reduced upper respiratory symptoms ... large mean
  effect size ... a total of 180 participants."
  → finding: URTI symptoms (decreased), 180-participant limitation attached.
- **PMID 27023596** — air-travelers RCT. Quote: "trial of 312 economy class
  passengers ... Placebo group participants had a significantly longer
  duration of cold episode days compared to the elderberry group."
  → finding: cold episode duration (decreased).

**Evidence quality:** consistently positive but small; the meta's entire
evidence base is 180 people.

## 3. zinc (elemental/general) and zinc-gluconate

- **PMID 21769305** — 2011 systematic review. Quote: "Three trials using
  zinc acetate in daily doses of over 75 mg showed a pooled result indicating
  a 42% reduction in the duration of colds (95% CI: 35% to 48%), while five
  trials using a total daily zinc dose of less than 75 mg uniformly found no
  effect."
  → findings: high-dose acetate (decreased 42%), low-dose (no_clear_change).
  The dose-dependency IS the story.
- **PMID 38719213** — Cochrane 2024. Source-only: its own conclusions were
  not retrieved verbatim; do not conflate with the commentary below.
- **PMID 39478818** — "Shortcomings in the Cochrane review on zinc for the
  common cold (2024)". Quote: "zinc lozenges shortened colds in adults by
  37% (95% CI: 27%−46%)" · "a child trial was inconsistent with the trials
  with adults and should be kept separated."
  → finding typed as commentary reanalysis (`source_type: other`), with the
  provenance explicit in `limitations`.
- **PMID 8678384** — Mossad 1996 (Annals of Internal Medicine), attached to
  **zinc-gluconate** (form-specific slug). Quotes: "100 employees of the
  Cleveland Clinic" · "13.3 mg of zinc from zinc gluconate" (one lozenge
  every 2 hours while awake) · "shortened common cold duration on average by
  4.0 days (95% CI 2.3-5.7 days)" · "Cough, nasal drainage and congestion
  were the symptoms most affected."
  → finding: cold duration (decreased), with the later quantile-reanalysis
  nuance (long colds shortened most) noted.

**Withheld:** PMID 9139564 appeared with a similar gluconate-lozenge title
but its identity/results were not confirmed this session — excluded rather
than risk conflating trials.

## 4. astragalus — honest thin result

- **PMID 27905672** — "Oral Astragalus (Huang qi) for preventing frequent
  episodes of acute respiratory tract infection in children" (Cochrane).
  Source-only: no result numbers retrieved. The remaining retrieved
  astragalus material was immunocompromised-population commentary without
  extractable results. Astragalus keeps its Immune Health route on
  predominant-use grounds, but its findings list stays empty rather than
  padded — a verified pass should pull the Cochrane review's conclusions.

## 5. beta-glucans

- **PMID 31573387** — 2019 marathon RCT (Wellmune, 250 mg/day, 91 days).
  Quotes: "Total severity of URTI was significantly lower in the insoluble
  yeast β-glucan group compared to the placebo group ... fewer URTI
  symptomatic days" · "Total severity was not different between the soluble
  yeast β-glucan group and placebo group. However, severity ratings for nasal
  discharge were significantly lower in both."
  → findings: insoluble form (decreased), soluble form (no_clear_change) —
  the form-dependency is preserved as two atomic rows.
- **PMID 30380356** — dispersible-beverage RCT. Title asserts fewer
  cold/flu symptomatic days; retrieved prose also reported no significant
  difference in URTI episode count/duration. Both facts are in one finding
  row with a verification flag.
- **PMID 23340963** — multicentric healthy-subjects RCT. Source-only.

**Evidence quality:** repeatable severity/symptom-day signals in
exercise-stress populations; episode-incidence effects inconsistent.

## 6. turkey-tail

- **PMID 17106715** — 2007 meta of adjuvant PSK in curatively resected
  gastric cancer. Quote: "eight randomized controlled trials including 8,009
  patients found an overall hazard ratio of 0.88 (95% CI 0.79-0.98;
  P = 0.018)."
  → finding: overall survival (increased).
- **URL PMC5687673** — network meta, 23 trials / 10,684 patients. Quote:
  "PSK treatment significantly increased 1–5 year overall survival ... with
  significant increases in 1–7 year disease-free survival ... no increase in
  side effects."
  → finding: 1-5 year OS (increased).

**Both findings carry the same hard limitation:** PSK is a
pharmaceutical-grade protein-bound extract given alongside chemotherapy in
Japanese/Asian oncology practice — these results do NOT describe consumer
turkey-tail mushroom supplements. The rows say so explicitly because they
will render publicly.

---

## Batch manifest

- substances covered: 7 (all existing, slugs DB-verified; astragalus
  source-only)
- sources: 16 (review_or_meta_analysis 8 · human_study 7 · other 1;
  source-only 5)
- findings: 15 (decreased 8 · increased 3 · no_clear_change 3 · mixed 1)

## Uncertainty report

1. Unverified regime as batches 1-2; `verify-pack.mjs` gates import.
2. ⚠ PMC3457740 (echinacea prevention) — result-sentence attribution needs
   confirmation; the finding row carries the flag.
3. ⚠ 30380356 (beta-glucan beverage) — decreased symptomatic days (title)
   alongside null episode metrics (prose); confirm both against the abstract.
4. 33832544 (echinacea antibiotic usage) — title-level result only.
5. PMID 9139564 excluded (unconfirmed identity vs the Mossad trial).
6. Two PMC-only identifiers (PMC3457740, PMC5687673) need PMID resolution.
7. Years/journals null where not stated in retrieved output; verify script
   backfills.
8. Astragalus: no findings — deliberate; see §4.

## Coverage gaps (batch 4+)

- Astragalus: the Cochrane children's review conclusions; TCM-context RCTs.
- Zinc: the 2024 Cochrane review's own certainty-rated conclusions; the
  children null (likely the Macknin trial) once its PMID is confirmed.
- Turkey-tail: immune-marker trials of consumer extracts (distinct from PSK).
- Vitamin-c: needs a route-swap decision before it can join Immune Health
  (3 route slots full) — owner call, flagged in migration 20260816231500.
