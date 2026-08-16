# Immune Health evidence base — batch 1 dossier (2026-08-16)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

## Provenance statement (read first)

This batch was produced inside a Claude Code session whose network policy
blocks direct access to PubMed, doi.org, and journal pages. It therefore does
**not** meet the opened-page bar in `CLAUDE_DEEP_RESEARCH_INSTRUCTIONS.md` §2.
What was done instead, and why it is still trustworthy enough to stage:

- Every PMID below was **copied verbatim from a PubMed result URL** returned
  by the search tool (e.g. `pubmed.ncbi.nlm.nih.gov/28783743/`) — none is
  from memory.
- Every quoted result sentence below is **copied verbatim from the search
  tool's returned content** for that query — none is from memory.
- The residual risks are (a) a search index mispairing a title with a PMID,
  and (b) a result summary paraphrasing a number incorrectly. Both are
  exactly what `verify-pack.mjs` checks: it resolves each PMID via NCBI
  E-utilities, compares titles, flags retractions, and backfills missing
  year/journal fields.

**Import workflow:** run `node verify-pack.mjs` from this directory on a
machine with normal network access → fix anything it flags → then drop
`pack.json` into Admin → Research. The importer accepts loose `.json` files.

Substance profiles are deliberately **not** included in the pack — all seven
substances already exist in the catalog under these slugs (routed to
Vitality / Immune Health by migration `20260810120000`):
`andrographis`, `pelargonium-sidoides`, `bee-propolis`, `bovine-colostrum`,
`thymosin-alpha-1`, `ll-37`, `guduchi`. Sources and findings link by slug.

---

## 1. andrographis

**Kept sources**

- **PMID 28783743** — "Andrographis paniculata (Chuān Xīn Lián) for
  symptomatic relief of acute respiratory tract infections in adults and
  children: A systematic review and meta-analysis" (2017; correction notice
  exists as PMID 30427943).
  Quote: "Andrographis paniculata appears beneficial and safe for relieving
  acute respiratory tract infection symptoms and shortening time to symptom
  resolution. However, these findings should be interpreted cautiously owing
  to poor study quality and heterogeneity."
  → findings: ARTI symptom severity (decreased), time to symptom resolution
  (decreased); authors' own quality caveat used as `limitations`.
- **PMID 10589439** — "Use of visual analogue scale measurements (VAS) to
  asses the effectiveness of standardized Andrographis paniculata extract
  SHA-10 in reducing the symptoms of common cold. A randomized double
  blind-placebo study."
  Quote: "At day 2 of treatment, a significant decrease in the intensity of
  symptoms including tiredness, sleeplessness, sore throat and nasal
  secretion was observed in the Andrographis group compared with placebo."
  → one composite finding (VAS symptom intensity at day 2, decreased).
- **PMID 20092985** — "A randomized double blind placebo controlled clinical
  evaluation of extract of Andrographis paniculata (KalmCold) in patients
  with uncomplicated upper respiratory tract infection."
  Quote: "The difference in effects between Andrographis paniculata and
  placebo was 10.85 points in favour of Andrographis paniculata on symptom
  severity score."
  ⚠ Attribution caution: the 10.85-point sentence appeared in the search
  tool's summary paragraph covering several trials; it matches this trial's
  known design but MUST be checked against the abstract during verification.
- **PMID 39005565** — "Andrographis paniculata extract versus placebo in the
  treatment of COVID-19: a double-blinded randomized control trial"
  (Research in Pharmaceutical Sciences, 2023).
  Quotes: "165 patients completed the study (83 patients in the APE group and
  82 patients in the placebo group)." · "Pneumonia occurrence during illness
  was 0/29 (0%) versus 3/28 (10.7%), (p=0.039), for those who received APE
  and placebo respectively." · "COVID-19 symptoms were significantly relieved
  on the last day of intervention in both groups, with no significant
  difference between groups."
  → findings: pneumonia occurrence (decreased), COVID-19 symptom relief
  vs placebo (no_clear_change). Note the pneumonia analysis is a subset
  (n=57 evaluable).

**Rejected/withheld:** PMID 14748896 (2004 systematic review) — subsumed by
the 2017 meta-analysis.

**Evidence quality:** one 2017 meta-analysis dominates; primaries are small
and older; the 2023 COVID RCT is the newest human evidence and includes an
honest null on its primary symptom comparison.

## 2. pelargonium-sidoides

**Kept sources**

- **PMID 24146345** — "Pelargonium sidoides extract for treating acute
  respiratory tract infections" (Cochrane review, 2013,
  DOI 10.1002/14651858.CD006323.pub3).
  Quotes: "Three trials (746 patients) of efficacy in acute bronchitis in
  adults showed substantial heterogeneity for all relevant outcomes" ·
  "P. sidoides may be effective in alleviating symptoms of acute
  rhinosinusitis and the common cold in adults, but doubt exists" · "Type of
  preparation was a potential cause of heterogeneity (not effective in tablet
  form)." · "Adverse events were more common with P. sidoides, but none were
  serious."
  → findings: acute bronchitis symptoms (decreased, low-certainty with
  authors' heterogeneity/preparation caveats), adverse events (increased,
  none serious).
- **PMID 36051888** — "Effects of Pelargonium sidoides extract EPs 7630 on
  acute cough and quality of life - a meta-analysis of randomized,
  placebo-controlled trials."
  Quote: "A more recent meta-analysis included data from 2,195 participants
  across 11 trials (3 in children/adolescents with acute bronchitis, 3 in
  adults with acute bronchitis, and 5 in adults with common cold)."
  → finding: acute cough symptoms (decreased). ⚠ The 2,195-participant
  sentence came from the search summary; confirm against the abstract.
- **PMID 31341433** — "Treatment with EPs 7630, a Pelargonium Sidoides Root
  Extract, Is Effective and Safe in Patients with the Common Cold: Results
  From a Randomized, Double Blind, Placebo-Controlled Clinical Trial."
  Source-only (no numeric result retrieved; title-level conclusion only).
- **PMID 22360575** — "Treatment of acute bronchitis with EPs 7630:
  randomized, controlled trial in children and adolescents." Source-only.

**Rejected/withheld:** PMID 18222667 (2008 meta-analysis) — subsumed by the
2013 Cochrane review; PMID 18646148 (earlier Cochrane version) — superseded
by the .pub3 update.

**Evidence quality:** unusually deep for a botanical — Cochrane-reviewed with
many manufacturer-sponsored RCTs (EPs 7630); Cochrane's certainty is low and
form-dependent (liquid, not tablet).

## 3. bee-propolis

**Kept sources**

- **PMID 37891178** — "Standardized Brazilian green propolis extract
  (EPP-AF®) in COVID-19 outcomes: a randomized double-blind
  placebo-controlled trial" (2023; DOI 10.1038/s41598-023-43764-w reported in
  a companion result).
  Quotes: "The trial enrolled 188 patients; 98 were assigned to the propolis
  group and 90 to the placebo group." · "the post-intervention length of
  hospital stay was of 6.5 ± 6.0 days in the propolis group versus 7.7 ± 7.1
  days in the control group (95% CI − 0.74 [− 1.94 to 0.42]; p = 0.22)" ·
  "there was a significant difference in the incidence of secondary infection
  between groups, with 6.1% in the propolis group versus 18.9% in the control
  group." Dose: "900 mg/day of EPP-AF® or placebo for 10 days."
  → findings: length of hospital stay (no_clear_change), secondary infection
  incidence (decreased).
- **PMID 34311528** — "Efficacy of Brazilian green propolis (EPP-AF®) as an
  adjunct treatment for hospitalized COVID-19 patients: A randomized,
  controlled clinical trial." Source-only (its own numbers were not retrieved
  this session).
- **PMID 38931472** — "The Effectiveness of a Dietary Supplement with Honey,
  Propolis, Pelargonium sidoides Extract, and Zinc in Children Affected by
  Acute Tonsillopharyngitis: An Open, Randomized, and Controlled Trial."
  Source-only, linked to both bee-propolis and pelargonium-sidoides.
  No findings: multi-component product (propolis-specific effect not
  isolable) and open-label design.

**Evidence quality:** the honest picture is hospital-context COVID adjunct
trials of one standardized Brazilian extract; a null on the 188-patient
trial's primary endpoint with a secondary-infection signal. No solid
standalone propolis RCT for community colds/URTIs was retrieved — gap for a
future batch.

## 4. bovine-colostrum

**Kept sources**

- **PMID 27462401** — "Bovine colostrum supplementation and upper
  respiratory symptoms during exercise training: a systematic review and
  meta-analysis of randomised controlled trials."
  Quote: "A systematic review and meta-analysis involving five randomized
  controlled trials with 152 participants found that over an 8-12 week
  follow-up period, bovine colostrum supplementation when compared to placebo
  significantly reduced the incidence rate of upper respiratory symptoms
  (URS) days by 44% and URS episodes by 38%." · "the low precision of
  individual study estimates limits confidence."
  → findings: URS days (decreased 44%), URS episodes (decreased 38%).
- **URL PMC10459079** — "Six Weeks of Supplementation with Bovine Colostrum
  Effectively Reduces URTIs Symptoms Frequency and Gravity for Up to 20 Weeks
  in Pre-School Children" (no PMID retrieved; PMC URL used as fallback).
  Quote: "bovine colostrum supplementation reduced the frequency of upper
  respiratory tract infection symptoms by 31% and reduced severity of
  symptoms by 37%."
  → findings: URTI symptom frequency (decreased 31%), URTI symptom severity
  (decreased 37%).
- **URL PMC10146600** — "Moderate Dose Bovine Colostrum Supplementation in
  Prevention of Upper Respiratory Tract Infections in Medical University
  Students: A Randomized, Triple Blind, Placebo-Controlled Trial."
  Source-only ("significant protection" is too vague to structure).

**Evidence quality:** consistent direction across exercisers, children, and
students, but small N throughout and the meta-analysis authors themselves
flag low precision.

## 5. thymosin-alpha-1

**Kept sources**

- **PMID 39814420** — "The efficacy and safety of thymosin α1 for sepsis
  (TESTS): multicentre, double blinded, randomised, placebo controlled,
  phase 3 trial" (BMJ, vol 388, e082583, 2025).
  Quotes: "enrolled 1106 adults aged 18-85 years with sepsis and randomly
  assigned them in a 1:1 ratio to receive thymosin α1 (n=552) or placebo
  (n=554)." · "28 day all cause mortality occurred in 127 participants
  (23.4%) in the thymosin α1 group and 132 (24.1%) in the placebo group
  (hazard ratio 0.99, 95% confidence interval 0.77 to 1.27; P=0.93" ·
  subgroup interactions by age and diabetes (P for interaction 0.01 / 0.04).
  → finding: 28-day all-cause mortality in sepsis (no_clear_change). This is
  the largest and most decision-relevant trial in the batch.
- **PMID 23327199** — "The efficacy of thymosin alpha 1 for severe sepsis
  (ETASS): a multicenter, single-blind, randomized and controlled trial."
  Quotes: "A total of 361 patients were allocated to either the control group
  (n=180) or Tα1 group (n=181)." · "The 28-day mortality rates were 26.0% in
  the Tα1 group and 35.0% in the control group, with marginal statistical
  significance (nonstratified analysis, P=0.062; log rank, P=0.049), and the
  relative risk of death in the Tα1 group was 0.74 (95% CI 0.54 to 1.02)."
  → finding: 28-day mortality in severe sepsis (mixed — direction favorable,
  significance marginal and analysis-dependent).
- **PMID 37845598** — "The efficacy of thymosin alpha-1 therapy in moderate
  to critical COVID-19 patients: a systematic review, meta-analysis, and
  meta-regression."
  Quote: "A meta-analysis suggests that treatment with thymosin alpha-1 may
  reduce mortality rate in moderate to critical COVID-19 patients. However,
  randomized clinical trials are still required to verify the findings."
  → finding: mortality in moderate-to-critical COVID-19 (decreased, with the
  authors' own verification caveat as limitations).
- **PMID 40969554** — "Efficacy of thymosin α1 for sepsis: a systematic
  review and meta-analysis of randomized controlled trials" (2025).
  Source-only: pooled estimate not retrieved this session; important because
  it post-dates TESTS.

**Rejected/withheld:** PMID 33968969, 33208294 (retrospective COVID cohorts —
observational, superseded by the meta-analysis); PMID 36042753 (phase III
COVID add-on RCT — no result retrievable this session, revisit in a verified
pass); PMID 30063854 (pancreatitis prophylaxis — off-assignment endpoint).

**Evidence quality:** this substance now carries the batch's most important
null: TESTS (n=1106, BMJ 2025) found no 28-day mortality benefit in sepsis,
against a backdrop of older, smaller, positive trials. Present both.

## 6. ll-37

**Kept sources**

- **PMID 25041740** — "Treatment with LL-37 is safe and effective in
  enhancing healing of hard-to-heal venous leg ulcers: a randomized,
  placebo-controlled clinical trial" (2014).
  ⚠ Title-level provenance only — the search results confirmed the trial and
  year but returned no effect sizes. The finding row records direction only;
  verification should pull n and doses from the abstract.
  → finding: venous leg ulcer healing (increased).
- **PMID 12603850** — "The cathelicidin anti-microbial peptide LL-37 is
  involved in re-epithelialization of human skin wounds and is lacking in
  chronic ulcer epithelium."
  → finding (mechanistic): LL-37 expression in chronic ulcer epithelium
  (decreased) — from the title's own statement.
- **PMID 23840194** — "The Human Cathelicidin Antimicrobial Peptide LL-37 as
  a Potential Treatment for Polymicrobial Infected Wounds." Source-only
  (review; the wound-healing animal data lives here).

**Evidence quality:** thin human evidence — one small topical RCT in leg
ulcers plus mechanistic work. Nothing supports systemic/injectable use, which
is how the gray market sells it; flagged in the uncertainty report.

## 7. guduchi

**Kept sources**

- **PMID 15619563** — "Efficacy of Tinospora cordifolia in allergic
  rhinitis."
  Quotes: "seventy-five patients randomly given either TC or placebo for 8
  weeks." · "100% relief was reported from sneezing in 83% of patients, in
  69% from nasal discharge" · "in the placebo group, there was no relief in
  79% from sneezing, in 84.8% from nasal discharge."
  → findings: sneezing relief (increased), nasal discharge relief
  (increased); n=75 as concrete limitation.
- **PMID 35037744** — "Tinospora Cordifolia (Giloy)-Induced Liver Injury
  During the COVID-19 Pandemic-Multicenter Nationwide Study From India."
  Quotes: "Giloy is associated with acute hepatitis with autoimmune features
  and can unmask autoimmune hepatitis (AIH) in people with silent AIH-related
  chronic liver disease" · "causality assessment revealed probable liver
  injury in 67.4%".
  → finding (observational): reports of liver injury with autoimmune features
  (increased). This is a safety signal, not an efficacy result — it belongs
  in the corpus precisely because the substance is marketed as an immune
  booster.
- **PMID 37273324** — "Tinospora cordifolia (Guduchi/Giloy)-Induced Liver
  Injury: A Case Review." Source-only (companion case review).

**Evidence quality:** one small older RCT for allergic rhinitis; the most
consequential recent human data is the hepatotoxicity case series.
**Suggested profile update (needs owner sign-off, not in this pack):** add a
`health_risks` entry to the `guduchi` substance noting reported
herb-induced liver injury with autoimmune features.

---

## Batch manifest

- substances covered: 7 (all existing; no substance rows in pack)
- sources: 24 (by type: review_or_meta_analysis 7 · human_study 15 ·
  in_vitro_or_mechanistic 1 · human observational case series filed under
  human_study 1 — see uncertainty report)
- findings: 23 (decreased 13 · increased 5 · no_clear_change 3 · mixed 1 ·
  by study type: meta/review 8 · human_rct 12 · human_observational 1 ·
  mechanistic 1 — the guduchi safety row counts once)

## Uncertainty report

1. **The whole batch is unverified** — produced without page access (network
   policy). `verify-pack.mjs` must pass before import. This is the designed
   mitigation, not an apology.
2. **Years/journals left null** wherever the search output did not state
   them (ETASS, KalmCold, SHA-10, both Cochrane-era Pelargonium RCTs, the
   colostrum meta, guduchi rhinitis trial, and others). The verify script
   backfills them from E-utilities; they were not guessed.
3. **Two PMC-only sources** (colostrum children and students trials) have no
   PMID in-pack; URL fallback used. Verification should resolve their PMIDs.
4. **Attribution cautions:** the KalmCold 10.85-point sentence and the
   Pelargonium 2,195-participant sentence came from search summary prose, not
   directly labeled abstract text — both are marked ⚠ above and must be
   checked against abstracts.
5. **Withheld findings:** propolis combo trial (multi-component, open-label),
   EPs 7630 common-cold RCT (title-level only), thymosin COVID phase III RCT
   (no result retrieved), students colostrum trial (result too vague).
6. **LL-37 route mismatch:** the only human RCT is topical, in leg ulcers;
   community use is injectable/systemic. No source retrieved supports that
   use.
7. **Guduchi safety row** is a case series; `human_study` was used as its
   source_type since the enum has no observational-series value, with
   study_type `human_observational` on the finding — reviewer may prefer
   `other`.

## Coverage gaps (next batch)

- Standalone propolis RCTs for community URTIs (not hospital COVID adjunct).
- Thymosin alpha-1: chronic hepatitis B adjuvant literature and the 2025
  post-TESTS meta-analysis pooled numbers; regulator label (thymalfasin) as
  an official_label_or_document source.
- Colostrum: resolve PMIDs and add the medical-students RCT numbers.
- Andrographis: hepatotoxicity case reports exist in the literature — worth a
  safety pass like guduchi's.
- The other Immune Health candidates the migration didn't route (elderberry,
  zinc forms, vitamin C, echinacea, beta-glucans) still have no Immune Health
  routes; routing them is DB organizing work, not pack work.
