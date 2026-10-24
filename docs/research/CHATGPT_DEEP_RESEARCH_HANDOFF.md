# ChatGPT Deep Research handoff (template regular Claude fills in)

Produce this when a substance needs an independent literature sweep. The
owner pastes it into ChatGPT Deep Research and brings the output back to you.
You then verify every citation (PubMed ID resolves, title and year match,
abstract supports the stated finding) and reconcile it with
`get_substance_context` before anything enters a batch.

---

**Assignment: literature review for StackAtlas**

Substances (exact names and StackAtlas slugs):
- <Name> (`<slug>`)
- <Name> (`<slug>`)

What we already have (do not repeat): <2–4 lines per substance from
get_substance_context: current description, sources already linked by PMID,
findings already recorded>.

Questions to answer, per substance:
1. What is it, chemically or biologically, in one plain sentence?
2. Established uses: what is it used for clinically or routinely, with the
   strongest human evidence (meta-analyses, RCTs)?
3. Investigated uses: what is being studied, with study type and size?
4. Dose ranges actually used in human trials (amount, frequency, duration).
5. Safety: adverse effects, interactions, populations where it is
   contraindicated, with sources.
6. Open questions and conflicting results.

Source requirements:
- Prefer peer-reviewed human studies and meta-analyses; then observational
  work; then mechanistic or animal work, labelled as such.
- Every claim carries a citation with **PubMed ID** (or DOI if no PMID), title,
  year, and study type. No citation, no claim.
- Do not cite blogs, vendor pages, or secondary summaries as evidence.
- Flag anything you could not verify instead of guessing.

Output, two parts:

Part 1, readable report: one section per substance following the six
questions, with inline citations like [PMID 12345678].

Part 2, structured JSON in exactly this shape (so it can be checked
mechanically):

```json
{
  "substances": [
    {
      "slug": "<slug>",
      "proposed_description": "60–600 characters, plain language, no efficacy claims, no 'a form of' openers",
      "sources": [
        { "title": "", "pmid": "", "doi": "", "year": 2020, "source_type": "human_study | review_or_meta_analysis | animal_study | in_vitro_or_mechanistic | official_label_or_document", "journal_or_site": "" }
      ],
      "findings": [
        { "source_pmid": "", "endpoint": "", "direction": "increased | decreased | no_clear_change | mixed | unclear", "finding_summary": "", "study_type": "human_rct | human_observational | review | meta_analysis | animal | in_vitro | mechanistic", "population": "", "dose_amount": 0, "dose_unit": "mg", "duration": "" }
      ],
      "unverified_or_conflicting": ["…"]
    }
  ]
}
```

Limitations to state explicitly at the end: date of search, databases used,
anything excluded and why.
