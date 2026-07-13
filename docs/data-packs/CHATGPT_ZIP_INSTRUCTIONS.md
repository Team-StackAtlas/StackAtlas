# StackAtlas — ChatGPT ZIP Build Instructions

Paste everything between the two `=====` lines into ChatGPT. Attach or paste
your raw source material (study text, labels, COAs, notes) in the same
message. ChatGPT will build a `.zip` you download and drop into
**Admin → Research → Upload research files**.

Use a ChatGPT model with the code interpreter / data-analysis tool enabled
(it needs to actually write files and zip them). If you are not sure, add the
sentence "use the code interpreter to build and give me the .zip file" to the
end.

---

===== BEGIN PROMPT =====

You are preparing a research-data ZIP for import into StackAtlas. Use your
code interpreter to write the files and produce a single downloadable `.zip`.
Do not describe the format back to me — build the files and give me the zip.

## Your one hard rule

Findings and source facts come ONLY from source material I give you in this
conversation. Never invent a PMID, DOI, URL, dose, population, or result from
memory. If I have not pasted a source, do not create a finding for it. When in
doubt, leave a field out rather than guessing. It is fine for a run to contain
only sources and no findings.

## What the ZIP contains

A flat or lightly-foldered ZIP of these file types only:

- `.json` — structured data packs (substances, brands, stacks, sources, findings)
- `.csv` — source lists only (one row per source document)
- `.md` / `.markdown` — one research document each, stored as a source

Hard limits (the importer rejects the whole archive if exceeded):
- at most 300 files inside the zip
- at most 10 MB per file
- at most 50 MB total uncompressed
- no zip inside the zip (no nested archives)
- no `..` or absolute paths in filenames

You may organize files into folders (e.g. `substances/`, `sources/`,
`documents/`) — the importer reads every supported file regardless of folder.
`.DS_Store` and `__MACOSX` are ignored automatically, so don't worry about them.

## File type 1 — JSON data pack (`.json`)

A single JSON object with this exact envelope, then any of the five arrays.
Every field name is snake_case. Only include arrays you have data for.

```json
{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "label": "short human name for this batch",
  "generated_by": "ChatGPT",
  "substances": [],
  "brands": [],
  "stacks": [],
  "sources": [],
  "findings": []
}
```

### substances[]
- `slug` (required) — kebab-case natural key, e.g. `magnesium-glycinate`
- `name` (required)
- `classification` (required) — one of: `Everyday`, `Clinical`, `Frontier`, `Unknown`
- `description` (required)
- optional: `aliases` (string[]), `origin`, `how_obtained`, `half_life`,
  `reported_dose_range`, `length_of_cycle`, `tolerance_buildup`,
  `risk_level` (one of `Low`, `Moderate`, `High`), `formula`,
  `routes` (array of `{ "domain": "...", "category": "..." }`),
  `type_tags` (string[]), `administration` (string[]), `markers` (string[]),
  `health_risks` (string[]), `subjective_effects` (string[]),
  `pairings` (string[] of other substance slugs),
  `most_popular_brand_slug`

### brands[]
- `slug` (required), `name` (required)
- optional: `description`, `shipping_reliability` (number 0–5, one decimal),
  `contamination_reports` (integer — WARNING: if you omit it on a re-import it
  resets to 0; always include the real number for an existing brand),
  `products` (array of `{ "name": "...", "substance_slug": "...",
  "ingredients": [{ "name": "...", "amount": "..." }], "health_labels": [] }`),
  `transparency` (object; known keys: `coa_available` bool, `per_batch_coa` bool,
  `third_party_lab` string, `testing_methods` string[], `public_contact` string,
  `documentation_url` string)

### stacks[]
- `name` (required), `description` (required)
- `components` (required) — array of 2 to 10 substance slugs

### sources[]
- `title` (required)
- `source_type` (required) — exactly one of:
  `human_study`, `review_or_meta_analysis`, `animal_study`,
  `in_vitro_or_mechanistic`, `official_label_or_document`,
  `brand_or_vendor_document`, `coa_or_testing_document`,
  `practitioner_source`, `community_or_influencer_mention`, `other`
- optional: `url`, `pmid`, `doi`, `year` (4-digit), `journal_or_site`,
  `authors`, `abstract`, `substances` (string[] of substance slugs to link),
  `notes`

### findings[]
Each finding must point at a source that exists somewhere in this same import
(in a `sources[]` array, a CSV row, OR already in StackAtlas) by exactly one of:
- `source_pmid`, `source_doi`, or `source_url` (one is required)

Then:
- `substance_slug` (required) — must match a substance in this import or already
  in StackAtlas
- `endpoint` (required) — what was measured, e.g. `sleep quality`
- `direction` (required) — one of: `increased`, `decreased`, `no_clear_change`,
  `mixed`, `unclear`
- `finding_summary` (required) — cautious, source-backed sentence. No
  "recommended", "proven", "best", "safe", or "effective".
- optional: `population`, `dose_amount` (number), `dose_unit` (one of `mcg`,
  `mg`, `g`, `IU`, `mL`, `cc`), `frequency`, `duration`,
  `study_type` (one of `human_rct`, `human_observational`, `review`,
  `meta_analysis`, `animal`, `in_vitro`, `mechanistic`, `official_document`,
  `other`), `limitations`

## File type 2 — CSV source list (`.csv`)

Sources only — no findings, no substances definitions. First row is the header.
Recognized columns (any subset, any order):

```
title,source_type,url,pmid,doi,year,journal_or_site,authors,abstract,substances,notes
```

- `substances` cell: separate multiple slugs with a semicolon `;`
- quote any cell that contains a comma
- `source_type` uses the same 10 values as JSON sources above

## File type 3 — Markdown document (`.md`)

Use these for a full write-up, protocol, label transcription, or set of notes
about ONE thing. The whole document is stored as a single source. Optional
frontmatter at the very top improves the extracted metadata:

```markdown
---
title: Magnesium Glycinate — sleep and recovery notes
url: https://example.org/mag-review
authors: J. Smith
date: 2024
source_type: review_or_meta_analysis
---

# Magnesium Glycinate

Body text here...
```

Rules for Markdown:
- If there's no frontmatter `title`, the first `#` heading is used, then the
  filename.
- If a heading exactly matches a StackAtlas substance name, the document links
  to that substance automatically. If a heading matches two substances, it is
  flagged for me to link by hand — that's fine, not an error.
- Markdown does NOT create findings. A finding is a specific measured result and
  must be written as a JSON or CSV row. Markdown is for the document itself.
- The document text is stored verbatim and deduped by content, so re-importing
  an unchanged file will not create a duplicate.

## Idempotency (so I can safely re-import)

The importer matches on natural keys, so fixing and re-dropping a file updates
instead of duplicating:
- substances/brands by `slug`; stacks by their sorted component set
- sources by `pmid`, then `doi`, then `url`, then document content, then
  `title`+`year`
Keep slugs and identifiers stable across runs.

## Now do this

1. Read the source material I pasted/attached.
2. Decide which files to create (packs, CSVs, markdown docs).
3. Write them, following every rule above. Validate your own JSON parses.
4. Zip them into `stackatlas-import.zip` and give me the download link.
5. In your reply, list what each file contains and flag anything you were
   unsure about (ambiguous substance names, missing identifiers, sources you
   left findings off of because the result wasn't stated).

===== END PROMPT =====

---

## After ChatGPT gives you the zip

1. StackAtlas → **Admin → Research → Import** → **Upload research files**.
2. Drop the `.zip`. You'll see one consolidated preview: which files were
   recognized, which were skipped, new vs. duplicate sources, matched
   substances, and any ambiguous matches or validation issues.
3. Review, then Import. New findings land as **pending review** — approve them
   in the Findings tab before anything shows publicly.
4. Bad batch? **Import History → Revert** removes exactly what it created.

You can also drop individual `.md`, `.csv`, or `.json` files directly without
zipping — the zip is just the easy path for a whole corpus at once.
