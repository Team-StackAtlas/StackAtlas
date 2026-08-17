# Immune Health evidence base — batch 4 dossier (2026-08-17)

**Status: UNVERIFIED — do not import until `verify-pack.mjs` passes.**

Same provenance regime as batches 1-3 (see batch 1's provenance statement).
This batch closes the deferred-results list from earlier batches: results
that earlier passes could only stage as source-only rows.

---

## 1. astragalus — the Cochrane empty review (batch 3 gap)

- **PMID 27905672.** Quote: "no RCTs met the inclusion criteria, and
  consequently, the authors concluded there is insufficient evidence to
  enable assessment of the effectiveness and safety of oral Astragalus as a
  sole intervention to prevent frequent ARTIs in children aged up to 14
  years" (search through December 31, 2015).
  → finding: direction `unclear` — the honest representation of an empty
  review. Astragalus's Immune Health route rests on predominant use; its
  evidence row now says exactly how thin the trial base is.

## 2. zinc-gluconate — the children's null (batch 3 gap)

- **PMID 9643859** — Macknin et al., JAMA 1998;279(24):1962-7. Quotes:
  "zinc gluconate glycine (ZGG) lozenges were not effective in treating cold
  symptoms in children and adolescents" · "enrolled 249 students in grades 1
  through 12 who were recruited within the first 24 hours" · "further
  studies with virologic testing are needed."
  → finding: no_clear_change. Pairs with the positive adult Mossad trial
  already staged — the age split is the story, and both rows now exist.

## 3. pelargonium-sidoides — the deferred common-cold numbers (batch 1 gap)

- **PMID 31341433** — 2019 RCT, previously source-only. Quotes: "105 adults
  with common cold symptoms were randomized to receive either 40 mg EPs 7630
  or matched placebo three times daily for 10 days" · "On day 5, the mean
  Sum of Symptom Intensity Differences (SSID) was significantly higher in
  the EPs 7630 group (12.5 ± 4.4 points) compared with the placebo group
  (8.8 ± 6.8 points)" · "After 10 days, 90.4% of EPs 7630 patients and 21.2%
  of placebo patients were clinically cured."
  → findings: day-5 symptom improvement (increased), day-10 clinical cure
  (increased). ⚠ The 90.4% vs 21.2% cure gap is unusually large for a
  common-cold trial — the row's `limitations` says so and verification
  should check it against the full paper.

## 4. thymosin-alpha-1 — the deferred COVID phase III (batch 1 gap)

- **PMID 36042753** — previously withheld for lack of numbers. Quotes:
  "A total of 105 COVID-19 patients were included in the study, of which 40
  and 65 were severe and moderate" · "The thymosin arm (11.1%) had a
  statistically lower death rate in comparison to the placebo arm (38.5%)."
  → finding: death rate (decreased), explicitly cross-referenced to the
  TESTS sepsis null so readers see the full mortality picture across
  indications.

---

## Batch manifest

- sources: 4 (3 upsert re-inclusions gaining findings, 1 new)
- findings: 5 (increased 2 · decreased 1 · no_clear_change 1 · unclear 1)

## Uncertainty report

1. Unverified regime as before; `verify-pack.mjs` gates import.
2. ⚠ 31341433's day-10 cure rates (90.4% vs 21.2%) need confirmation
   against the paper — flagged in the finding row itself.
3. 36042753's arm sizes were not retrieved (105 total; per-arm split
   unknown) — population field kept generic.
4. Years/journals null where unstated; verify script backfills.

## Coverage gaps (remaining)

- Regulator/official documents for the category (needs page access).
- Consumer turkey-tail (non-PSK) immune trials.
- Full-rigor re-verification of all four batches once network opens.
