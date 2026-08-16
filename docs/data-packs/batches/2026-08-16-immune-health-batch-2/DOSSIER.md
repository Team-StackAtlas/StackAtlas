# Immune Health evidence base — batch 2 dossier (2026-08-16)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batch 1 (read that dossier's provenance statement
first): produced in a network-restricted session; every PMID copied verbatim
from a returned PubMed result URL, every quoted sentence verbatim from search
tool output; nothing from memory; the E-utilities verify script is the gate.

This batch works batch 1's coverage-gap list: thymosin alpha-1's licensed
territory (chronic hepatitis B), the post-TESTS 2025 pooled sepsis numbers,
a standalone propolis cold trial, and identifier backfills to batch 1.

---

## 1. thymosin-alpha-1 — chronic hepatitis B (the licensed indication)

- **PMID 11736720** — "The efficacy of thymosin in the treatment of chronic
  hepatitis B virus infection: a meta-analysis."
  Quote: "Five trials involving 353 patients were identified in one
  meta-analysis examining thymosin treatment compared to placebo. The
  virological response odds ratios of thymosin over placebo at 12 months
  post-treatment were 2.67 (95% confidence interval: 1.25-5.68)."
  → finding: virological response at 12 months post-treatment (increased).
- **URL PMC2693103** — "Treatment with lamivudine versus lamivudine and
  thymosin alpha-1 for e antigen-positive chronic hepatitis B patients: a
  meta-analysis" (PMID not retrieved; PMC URL fallback).
  Quote: "Eight trials involving 583 patients showed that lamivudine and
  thymosin alpha-1 combination treatment was significantly superior to
  lamivudine treatment in terms of ALT normalization rate (80.2% vs. 68.8%),
  virological response rate (84.7% vs. 74.9%), and HBeAg seroconversion rate
  (45.1% vs. 15.2%)."
  → findings: HBeAg seroconversion (increased), virological response
  (increased) — both explicitly labeled combination-vs-lamivudine in
  `limitations`, since they do not measure thymosin alone. The ALT row was
  withheld to avoid three near-duplicate rows from one sentence.
- **PMID 10607256** — phase III multicentre randomized double-blind
  placebo-controlled CHB study. Source-only (no numbers retrieved).
- **PMID 35616850** — HBV-related acute-on-chronic liver failure RCT.
  Source-only (no numbers retrieved).

**Evidence quality:** the CHB literature is old (meta-analysis era
2001-2009) and heterogeneous; the combination data is the strongest signal.
Descriptions of thymalfasin's regulatory status stay out of the pack — no
regulator document was openable this session.

## 2. thymosin-alpha-1 — post-TESTS sepsis pooling

- **PMID 40969554** — "Efficacy of thymosin α1 for sepsis: a systematic
  review and meta-analysis of randomized controlled trials" (2025; listed
  source-only in batch 1, finding added here).
  Quotes: "included 11 randomized controlled trials (RCTs) with 967 patients
  in the thymosin α1 (Tα1) group and 960 patients in the control group." ·
  "a significant reduction in 28-day mortality associated with Tα1
  administration (OR 0.73, 95%CI: 0.59-0.90, P = 0.003). However, analyses
  of high-quality and multi-center subgroups did not reveal a mortality
  benefit in these more rigorous study designs."
  → finding: pooled 28-day mortality (decreased) with the authors' own
  subgroup caveat as `limitations`. Read together with batch 1's TESTS null:
  the pooled positive is driven by smaller, lower-quality trials.

## 3. bee-propolis — standalone cold trial

- **PMID 2695883** — "[Therapeutic value of flavonoids in Rhinovirus
  infections]" (non-English publication).
  Quote: "treating 50 patients at an ENT clinic during 1987 ... the placebo
  group had full recovery in a mean of 4.80 days, while symptoms in the
  therapeutic group lasted 2.5 times shorter than in the placebo group."
  → finding: time to recovery from common cold (decreased), study_type
  `other` because randomization/blinding could not be confirmed this
  session. This is the only standalone propolis-for-colds result retrieved;
  it is old and weak, and the finding says so.

## 4. andrographis safety pass — honest empty result

A search for Andrographis paniculata hepatotoxicity case reports returned
only hepatoprotective animal studies and no citable human case report. No
safety finding was invented. Note: hepatotoxicity case reports for
andrographis are believed to exist in regulator/LiverTox literature, which
was not reachable this session — a verified pass should revisit before
concluding the signal is absent.

## 5. batch 1 backfills (edits to batch 1's pack.json)

- Pre-school colostrum trial: PMID 37630816, DOI 10.3390/nu15163626, year
  2023 added (quote: "DOI: 10.3390/nu15163626; PMID: 37630816"); cohort
  detail added to notes (57 children: 35 colostrum, 22 placebo).
- Medical-students colostrum trial: DOI 10.3390/nu15081925, year 2023 added
  (quote: "with DOI: 10.3390/nu15081925, published on April 16, 2023");
  PMID still unresolved.

---

## Batch manifest

- sources: 6 (5 thymosin-alpha-1, 1 bee-propolis; 2 source-only)
- findings: 5 (increased 3 · decreased 2)
- plus 2 identifier backfills to batch 1's pack.json

## Uncertainty report

1. Unverified regime as batch 1; `verify-pack.mjs` must pass first.
2. PMC2693103's PMID unresolved; verify script resolves it.
3. The propolis trial's design (randomization/blinding) is unconfirmed —
   study_type deliberately `other`; its age (patients treated 1987) makes it
   experience-era evidence, kept because it is the only standalone
   propolis-for-colds trial retrieved.
4. Years for 11736720, 10607256, 35616850, 2695883 left null (not stated in
   retrieved output); verify script backfills.
5. The lamivudine-combination findings measure combination therapy, not
   thymosin alone — stated in each row's limitations.
6. Andrographis hepatotoxicity: absence of retrieved case reports is not
   evidence of absence; flagged for a verified pass.

## Coverage gaps (batch 3+)

- The 2022 colostrum systematic review/meta-regression (seen only on an
  aggregator; no PMID retrieved) would supersede the 2016 exercisers meta.
- Regulator documents (thymalfasin label; EMA/FDA herbal monographs for
  andrographis and pelargonium) as `official_label_or_document` sources —
  requires page access.
- Immune Health routing candidates beyond the current 7 (elderberry,
  echinacea, zinc forms, vitamin C, beta-glucans) — needs catalog access to
  confirm existing slugs before any pack references them.
