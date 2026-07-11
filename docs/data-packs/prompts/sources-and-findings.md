# Prompt template — Sources and Findings

Use this to generate one `SourcePackRow` plus its `FindingPackRow[]` with a
cheap model (Claude Haiku, GPT-mini class). Batch size: **one substance's
sources+findings per call.** See [`../README.md`](../README.md) §4 for why.

## The golden rule — read this before using the template

**The model must only extract findings from the real source material you
paste into the prompt below.** Never ask the model to "write findings about
substance X" from memory. A model asked to produce a specific PMID, a
specific effect, and a specific study population with nothing to ground it
will confidently invent all three — that is exactly how hallucinated
citations get into a research database, and a fabricated-but-plausible PMID
is very hard to catch later.

This template forces that constraint structurally: you paste the abstract
and citation metadata for ONE real paper, and the model may only summarize
what is in that pasted text.

If you instead want to batch-generate a plain list of **sources** (title,
authors, journal, PMID/DOI, no interpretive findings) from a citation list,
that's a lower-risk task because there's no room for the model to invent an
effect — but you must still **verify every PMID/DOI against PubMed before
import**. Use the E-utilities `esummary` endpoint and confirm the returned
title/authors/year match:

```
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=<PMID>&retmode=json
```

Do not import a PMID/DOI you have not verified this way.

---

## Template — one source + its findings, grounded in pasted material

Copy everything in the fenced block below, fill in `<<...>>` (including
pasting the real abstract), and paste it as the entire prompt.

````
You are generating a StackAtlas Data Pack v1 document containing ONE SOURCE
row and its FINDING rows, extracted ONLY from the real source material
pasted below. Output ONLY a single JSON document — no prose before or after
it, no markdown code fences, no explanation.

CRITICAL: Do not use any knowledge about this substance or topic from your
training data. Every finding you write must be traceable to a specific
statement in the pasted abstract/material below. If the pasted material does
not support a finding, do not invent one — it is correct and expected to
produce zero findings for material that doesn't contain measurable outcomes.

The JSON document must have exactly this shape:

{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "<<your model name>>",
  "label": "<<short label, e.g. 'l-theanine sleep source'>>",
  "sources": [ { ...one SourcePackRow... } ],
  "findings": [ ...FindingPackRow objects, zero or more... ]
}

The SourcePackRow (fill in from the citation metadata given below — do not
alter or guess any of these values):

{
  "title": string,          // REQUIRED, exact paper title
  "source_type": string,    // REQUIRED, one of: "human_study" | "review_or_meta_analysis" | "animal_study" | "in_vitro_or_mechanistic" | "official_label_or_document" | "brand_or_vendor_document" | "coa_or_testing_document" | "practitioner_source" | "community_or_influencer_mention" | "other"
  "url": string,            // optional
  "pmid": string,           // optional, exactly as given
  "doi": string,            // optional, exactly as given
  "year": number,           // optional
  "journal_or_site": string,// optional
  "authors": string,        // optional
  "abstract": string,       // optional, may paste the abstract verbatim here
  "substances": ["<<substance slug>>"]
}

Each FindingPackRow (one per measurable outcome you can point to in the
pasted material — omit anything not directly supported):

{
  "source_pmid": string,     // must match the pmid above (or use source_doi/source_url if no pmid)
  "substance_slug": string,  // REQUIRED, the substance slug given below
  "endpoint": string,        // REQUIRED, what was measured, e.g. "sleep latency"
  "direction": string,       // REQUIRED, one of: "increased" | "decreased" | "no_clear_change" | "mixed" | "unclear"
  "finding_summary": string, // REQUIRED, see LANGUAGE RULES below
  "population": string,      // optional, who was studied, from the pasted material
  "dose_amount": number,     // optional, from the pasted material only
  "dose_unit": string,       // optional, one of: "mcg" | "mg" | "g" | "IU" | "mL" | "cc"
  "frequency": string,       // optional
  "duration": string,        // optional
  "study_type": string,      // optional, one of: "human_rct" | "human_observational" | "review" | "meta_analysis" | "animal" | "in_vitro" | "mechanistic" | "official_document" | "other"
  "limitations": string      // optional, from the pasted material if stated (sample size, design caveats, etc.)
}

LANGUAGE RULES for finding_summary:
- Be cautious and explicitly source-backed: "In a 2019 randomized trial of
  45 adults, ..." not "Substance X reduces anxiety."
- Never write "recommended dosage", "best", "proven", "safe", "effective",
  or "works".
- Frame outcomes as what was reported/observed in that specific study, not
  as general claims about the substance.
- If the pasted material states a limitation (small sample, self-report,
  animal model, etc.), include it in `limitations`.

Return ONLY the JSON document. Do not wrap it in markdown code fences. Do not
add commentary before or after it.

Substance slug this source is about: <<substance-slug>>

Citation metadata:
  Title: <<paste exact title>>
  Authors: <<paste authors>>
  Journal: <<paste journal/site name>>
  Year: <<paste year>>
  PMID: <<paste PMID if known>>
  DOI: <<paste DOI if known>>
  URL: <<paste URL if known>>

Abstract / source material (paste the FULL abstract or excerpt here — this
is the ONLY material the model may draw findings from):
<<paste the abstract verbatim>>
````

## Example output

```json
{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "claude-haiku-4-5",
  "label": "glycine sleep source",
  "sources": [
    {
      "title": "New Therapeutic Strategy for Amino Acid Medicine: Glycine Improves the Quality of Sleep",
      "source_type": "review_or_meta_analysis",
      "pmid": "22293292",
      "doi": "10.1254/jphs.11R04FM",
      "year": 2012,
      "journal_or_site": "Journal of Pharmacological Sciences",
      "authors": "Bannai M, Kawai N",
      "substances": ["glycine"]
    }
  ],
  "findings": [
    {
      "source_pmid": "22293292",
      "substance_slug": "glycine",
      "endpoint": "subjective sleep quality",
      "direction": "increased",
      "finding_summary": "A 2012 review of human trials summarized findings that glycine taken shortly before bedtime was associated with improved subjective sleep quality ratings in adults reporting unsatisfactory sleep.",
      "dose_amount": 3,
      "dose_unit": "g",
      "frequency": "once, before bedtime",
      "study_type": "review",
      "limitations": "Narrative review summarizing multiple small trials rather than a single controlled study."
    }
  ]
}
```
