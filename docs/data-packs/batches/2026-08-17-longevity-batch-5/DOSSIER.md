# Longevity evidence base — batch 5 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-4 (see batch 1's provenance statement):
network-restricted session; PMIDs verbatim from returned PubMed result URLs;
quotes verbatim from search output; E-utilities verification gates import.

**Why this batch:** live coverage query showed Longevity is the thinnest
flagship category — **1 of 91 routed substances** had any research finding.
This batch covers 8 headliners, all slugs DB-verified: resveratrol,
nicotinamide-mononucleotide, nicotinamide-riboside, coenzyme-q10, metformin,
rapamycin, quercetin, sulforaphane. The longevity space is hype-dense, so
nulls and context-limits lead throughout.

---

## Per-substance notes (quotes in pack rows; highlights here)

1. **resveratrol** — the honest arc: a CV-risk-marker meta finding *nothing*
   ("does not suggest any benefit ... on cardiovascular risk factors"; no
   change in cholesterol, LDL, triglycerides, glucose — PMID 25885871), an
   endothelial-function meta finding increased FMD but no BP effect
   (PMID 31264084), and a T2D anthropometric meta with weight/BMI/waist
   reductions (PMID 40842160).
2. **nicotinamide-mononucleotide** — PMID 39221308 (10 RCTs, 437
   participants, 150-1200 mg/day): NAD reliably rises; "most of the
   clinically relevant outcomes were not significantly different"; physical
   performance improvement non-significant (grip 29.9→30.5 kg). The
   raises-the-biomarker-not-the-outcome story, stated plainly. Glucose/lipid
   meta (PMID 39116016) source-only.
3. **nicotinamide-riboside** — the NIAGEN dose-ranging RCT (PMC6611812):
   NAD+ +22%/51%/142% at 100/300/1000 mg, adverse events like placebo, no
   flushing. Surrogate endpoint only — the finding's limitations say so.
   Obese-men trial (PMID 29992272) source-only.
4. **coenzyme-q10** — PMID 28738783 (14 RCTs, n=2,149): heart-failure
   mortality RR 0.69 (0.50-0.95), exercise capacity improved, ejection
   fraction unchanged. Context-limited to HF adjunct therapy and labeled as
   such. (Q-SYMBIO's own report was not retrieved with an identifier this
   session; the meta subsumes it.)
5. **metformin** — UKPDS 34 (PMID 9742977, Lancet 1998): all-cause mortality
   −36% — *in overweight newly diagnosed type 2 diabetics*, which the
   limitations state bluntly since longevity-community readers will want to
   generalize. UKPDS 91 24-year follow-up (PMID 38772405, 2024): near-
   lifelong legacy effect, typed human_observational (post-trial monitoring).
6. **rapamycin** — the PEARL 48-week trial (PMC12074816): primary outcome
   (visceral adiposity) null, safety comparable to placebo, lean-mass gain
   only in the women/10 mg subgroup — both rows present, primary null first.
7. **quercetin** — two BP metas: 17-trial (n=896) SBP −3.09/DBP −2.86 mmHg
   (PMID 31940027) and the earlier 7-trial meta whose load-bearing result is
   the dose split — significant only at ≥500 mg/day (PMID 27405810).
8. **sulforaphane** — two primary-outcome nulls: prediabetes fasting glucose
   (PMC11879859; 0.2 mmol/L, not meeting the prespecified endpoint;
   exploratory subgroup 0.4) and the children's autism RCT (PMID 34034808,
   n=57, OACIS not significant). The 2014 young-men ASD trial (PMID
   25313065) source-only.

## Batch manifest

- substances covered: 8 (all existing, slugs DB-verified)
- sources: 16 (review_or_meta_analysis 8 · human_study 8; source-only 4)
- findings: 17 (decreased 6 · increased 5 · no_clear_change 6)

## Uncertainty report

1. Unverified regime; `verify-pack.mjs` gates import.
2. Three PMC-only identifiers (NIAGEN trial, PEARL trial, prediabetes BSE
   trial) need PMID resolution during verification.
3. Q-SYMBIO excluded as a standalone source (no identifier retrieved);
   covered via the 2017 meta.
4. Years/journals null where unstated; verify script backfills.
5. Fisetin, glutathione, astaxanthin, NAD+/NADH forms remain uncovered —
   deliberately cut for depth over width.

## Coverage gaps (batch 6+)

- Longevity remainder: fisetin (senolytic trials are thin), astaxanthin,
  glutathione forms, spermidine if catalogued.
- Beauty & Skin is the next thinnest flagship (1/85): collagen peptides,
  retinol forms, hyaluronic acid, ceramides all likely covered by strong
  meta-analyses.
- Digestive Health (3/107): probiotic strains, psyllium, glutamine.
