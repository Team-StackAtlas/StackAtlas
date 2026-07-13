# Data Packs — operator manual

A **data pack** is a single JSON document that bulk-loads or updates StackAtlas
catalog and research data. Packs are usually generated outside the app (by a
cheaper AI model, or by a script like `scripts/export-mock-pack.ts`) and then
imported through **Admin → Research → Import**.

The importer also accepts **multiple files at once and ZIP archives** — see
§0 below. A JSON pack is still the only way to define substances, brands,
stacks, and findings; the other formats feed the sources side of the pipeline.

---

## 0. Upload formats and limits

**Admin → Research → Import → Upload research files** accepts any mix of:

| Format | What it becomes |
|---|---|
| `.json` | A full data pack (this document's main subject) |
| `.csv` | A list of research sources, one per row (§ Sources CSV columns: `title,source_type,url,pmid,doi,year,journal_or_site,authors,abstract,substances,notes`; multiple substance slugs separated by `;`) |
| `.md` / `.markdown` | One research **source** per file — the document text is stored verbatim, metadata (title/url/year/authors/source_type) is read from optional frontmatter or the first heading, and headings that exactly match a substance name link automatically (ambiguous matches are flagged for manual linking, never guessed) |
| `.zip` | Unpacked in the browser and every supported file inside is processed as above |

ZIP safety limits (the archive is rejected as a whole if exceeded):

- **300 entries** max
- **10 MB** per file (uncompressed)
- **50 MB** total (uncompressed)
- suspicious compression ratios are rejected (archive-bomb guard)
- entries with `..`/absolute paths are refused (zip-slip guard)
- nested archives inside the ZIP are skipped
- `.DS_Store`, `Thumbs.db`, and `__MACOSX/` are silently ignored

Every file in a batch parses independently — one malformed file is reported
per-file in the preview and does not discard the valid files uploaded with it.

Markdown documents dedupe on a **content hash**: re-importing an unchanged
`.md` file (even renamed) updates the existing source instead of creating a
duplicate. This slots into the same natural-key chain as everything else:
`pmid → doi → url → content hash → title+year`.

Markdown never creates findings. A finding is a specific measured result and
must be authored as a JSON or CSV row — extracting "findings" from freeform
prose would violate the golden rule in §4.

For building a corpus ZIP with an external model, hand the model
[`CHATGPT_ZIP_INSTRUCTIONS.md`](CHATGPT_ZIP_INSTRUCTIONS.md) — it contains a
paste-ready prompt with this whole contract inlined.

Rows inside a pack reference each other by **natural keys** — a substance
slug, a source's PMID/DOI/URL — never by database UUIDs. That's what makes
packs safe to hand-author, regenerate, and re-import: the server resolves
references and upserts, so importing the same pack twice does not create
duplicates.

The pack contract lives in code at
[`src/services/import/types.ts`](../../src/services/import/types.ts) — that
file is the source of truth. This document explains how to use it. If the two
ever disagree, `types.ts` wins.

The server-side validation and import behavior lives in
[`supabase/migrations/0016_research_import_system.sql`](../../supabase/migrations/0016_research_import_system.sql).
Everything below (enum values, slugification, dedup rules) is read from that
migration, not guessed.

---

## 1. The v1 envelope

A pack is one JSON object:

```json
{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "claude-haiku-4-5 (manual prompt)",
  "generated_at": "2026-07-11T00:00:00Z",
  "label": "Sleep substances batch 1",
  "substances": [],
  "brands": [],
  "stacks": [],
  "sources": [],
  "findings": []
}
```

| Field | Required | Notes |
|---|---|---|
| `kind` | yes | Must be exactly `"stackatlas-data-pack"`. |
| `schema_version` | yes | Must be exactly `1`. |
| `generated_by` | no | Free text — model name and/or tool. Shown in import history. |
| `generated_at` | no | ISO timestamp. Informational only. |
| `label` | no | Human-readable batch name, shown in import history. |
| `substances` / `brands` / `stacks` / `sources` / `findings` | no | Any subset may be present. A pack can contain just one entity type — this is the normal case for chunked generation (see §3). |

Entities import in a fixed order — **substances → brands → stacks → sources →
findings** — because later entities reference earlier ones by natural key
(a stack's components must resolve to substances; a finding's source must
resolve to a source). Within one pack, a substance referenced by a later
stack/finding can be defined earlier in the *same* pack, or can already exist
in the database — both work.

---

## 2. One complete annotated example

This is illustrative only (JSON has no comments — see
`examples/sample-pack.json` for a pack you can actually import):

```jsonc
{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "claude-haiku-4-5",
  "label": "Amino acids batch 1",
  "substances": [
    {
      "slug": "glycine",                 // natural key; server re-slugifies anyway
      "name": "Glycine",
      "classification": "Everyday",      // one of CLASSIFICATIONS_V1
      "description": "A non-essential amino acid...",
      "aliases": ["Aminoacetic acid"],    // additive on re-import, globally unique
      "reported_dose_range": "Commonly studied range: 3 g before bedtime",
      "risk_level": "Low",               // one of RISK_LEVELS_V1
      "routes": [{ "domain": "Mind", "category": "Sleep" }],
      "type_tags": ["Supplement", "Amino Acid"],
      "administration": ["Oral"],
      "health_risks": ["Mild gastrointestinal discomfort at high doses"],
      "subjective_effects": ["Reported relaxation before sleep"],
      "pairings": ["l-theanine"],        // substance slugs; unknown slug -> warning, not error
      "most_popular_brand_slug": "purity-labs"
    }
  ],
  "sources": [
    {
      "title": "New Therapeutic Strategy for Amino Acid Medicine: Glycine Improves the Quality of Sleep",
      "source_type": "review_or_meta_analysis",  // one of RESEARCH_SOURCE_TYPES_V1
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
      "source_pmid": "22293292",         // must resolve to a source in this pack or the DB
      "substance_slug": "glycine",
      "endpoint": "subjective sleep quality",
      "direction": "increased",          // one of FINDING_DIRECTIONS_V1
      "finding_summary": "A 2012 review of human trials summarized findings that glycine taken shortly before bedtime was associated with improved subjective sleep quality ratings.",
      "dose_amount": 3,
      "dose_unit": "g",                  // one of DOSE_UNITS_V1
      "study_type": "review"             // one of FINDING_STUDY_TYPES_V1
    }
  ]
}
```

---

## 3. Field-by-field reference

Enum values quoted below are read directly from `types.ts` and enforced
server-side in `0016_research_import_system.sql`.

### Substances (`substances[]`, `SubstancePackRow`)

Natural key: **`slug`** (server re-runs `import_slugify`: lowercase, non
`a-z0-9` runs collapsed to a single `-`, trimmed — so `"L-Theanine!"` and
`"l-theanine"` land on the same row).

| Field | Required | Type | Allowed values | On re-import (same slug) |
|---|---|---|---|---|
| `slug` | **yes** | string | any non-empty (post-slugify) | natural key |
| `name` | **yes** | string | — | overwritten |
| `classification` | **yes** | enum | `Everyday`, `Clinical`, `Frontier`, `Unknown` | overwritten |
| `description` | **yes** | string | — | overwritten |
| `aliases` | no | string[] | — | **additive** (not deleted on re-import); alias uniqueness is **global** across all substances (`lower(alias)` unique index) — a duplicate alias claimed by a different substance is silently dropped |
| `origin` | no | string | — | kept if new value is null/empty, else overwritten |
| `how_obtained` | no | string | — | same as `origin` |
| `half_life` | no | string | free text, e.g. `"3–5 hours"` | same as `origin` |
| `reported_dose_range` | no | string | safe-language dose text → `substances.average_dosage` | same as `origin` |
| `length_of_cycle` | no | string | — | same as `origin` |
| `tolerance_buildup` | no | string | — | same as `origin` |
| `risk_level` | no | enum | `Low`, `Moderate`, `High` | same as `origin` |
| `formula` | no | string | — | same as `origin` |
| `routes` | no | `{domain, category}[]` | free text; vocab row auto-created in `category_routes` | **fully replaced** (delete then re-insert) when the key is present |
| `type_tags` | no | string[] | free text; vocab row auto-created in `type_tags` | fully replaced |
| `administration` | no | string[] | free text; vocab row auto-created in `administration_methods` | fully replaced |
| `markers` | no | string[] | free text; vocab row auto-created in `markers` | fully replaced |
| `health_risks` | no | string[] | — | fully replaced |
| `subjective_effects` | no | string[] | — | fully replaced |
| `pairings` | no | string[] (substance slugs) | must resolve via slug, alias, or exact name | fully replaced; a slug that doesn't resolve becomes a **warning** on that row (row still imports), self-pairing is silently skipped |
| `most_popular_brand_slug` | no | string (brand slug) | — | applied in a **second pass** after brands import; requires both the substance and the brand to exist (in this pack or the DB) — unknown either side produces an error entry with no partial effect |

### Brands (`brands[]`, `BrandPackRow`)

Natural key: **`slug`**.

| Field | Required | Type | On re-import |
|---|---|---|---|
| `slug` | **yes** | string | natural key |
| `name` | **yes** | string | overwritten |
| `description` | no | string | kept if new value is null/empty |
| `shipping_reliability` | no | number, 0–5 one decimal | kept if new value is null/empty |
| `contamination_reports` | no | number | **always overwritten**, defaults to `0` if omitted — re-sending a brand row without this field silently resets the count to 0 |
| `products` | no | `BrandProductPackRow[]` | see below |

`BrandProductPackRow` — natural key within a brand is `(brand, product name)`:

| Field | Required | Notes |
|---|---|---|
| `name` | **yes** | product row without a name is skipped with a warning |
| `substance_slug` | no | unknown slug → warning; product still created, just unlinked |
| `ingredients` | no | `{name, amount?}[]`, fully replaced per product when the key is present |
| `health_labels` | no | string[], free text, fully replaced when the key is present |

### Stacks (`stacks[]`, `StackPackRow`)

Natural key: **sorted, de-duplicated set of component slugs** joined with
`+` (the "component signature").

| Field | Required | Notes |
|---|---|---|
| `name` | **yes** | overwritten on re-import |
| `description` | **yes** | overwritten on re-import |
| `components` | **yes** | **2–10** distinct substance slugs (aliases/names also resolve). Fewer than 2, more than 10, or any component that doesn't resolve → the **whole stack row errors** (not a partial import). Import sets `status = 'approved'` every time. |

### Sources (`sources[]`, `SourcePackRow`)

Natural key: **hierarchical** — `pmid` if present, else `doi`, else `url`,
else `title` + `year` (case-insensitive). First match wins.

| Field | Required | Type | Allowed values |
|---|---|---|---|
| `title` | **yes** | string | — |
| `source_type` | **yes** | enum | `human_study`, `review_or_meta_analysis`, `animal_study`, `in_vitro_or_mechanistic`, `official_label_or_document`, `brand_or_vendor_document`, `coa_or_testing_document`, `practitioner_source`, `community_or_influencer_mention`, `other` |
| `url`, `pmid`, `doi` | no | string | at least one of these (or title+year) should be stable enough to dedup on |
| `year` | no | number | must be a 4-digit year or omitted |
| `journal_or_site`, `authors`, `abstract` | no | string | — |
| `substances` | no | string[] (slugs) | links via `research_source_substances`; unknown slug → warning |
| `notes` | no | string | stored on **every** substance link created by this row (not per-substance) |

On re-import (same natural key): `title` and `source_type` are always
overwritten; `authors`/`year`/`journal_or_site`/`url`/`doi`/`pmid`/`abstract`
are kept if the new value is null/empty. Substance links are additive.

### Findings (`findings[]`, `FindingPackRow`)

Natural key: a server-computed `dedup_key` of
`source + substance + lower(endpoint) + lower(population) + dose + direction`.
**Findings always land as `pending_review`** on first insert — there is no
field to set review status from a pack, by design.

| Field | Required | Type | Allowed values |
|---|---|---|---|
| `source_pmid` / `source_doi` / `source_url` | **exactly one must resolve** | string | must match a source already in the database, or one imported earlier in the *same* pack (sources import before findings) |
| `substance_slug` | **yes** | string | must resolve |
| `endpoint` | **yes** | string | what was measured, e.g. `"sleep quality"` |
| `direction` | **yes** | enum | `increased`, `decreased`, `no_clear_change`, `mixed`, `unclear` |
| `finding_summary` | **yes** | string | cautious, source-backed phrasing (see §4 language guardrails) |
| `population`, `frequency`, `duration`, `limitations` | no | string | — |
| `dose_amount` | no | number | — |
| `dose_unit` | no | enum | `mcg`, `mg`, `g`, `IU`, `mL`, `cc` |
| `study_type` | no | enum | `human_rct`, `human_observational`, `review`, `meta_analysis`, `animal`, `in_vitro`, `mechanistic`, `official_document`, `other` |

On re-import (same `dedup_key`): `finding_summary` is always overwritten;
`frequency`/`duration`/`study_type`/`limitations` are kept if the new value is
null/empty. **`review_status` is never touched by an update** — once a
moderator approves a finding, re-importing the same finding (same
`dedup_key`, refreshed summary) will not revert it to `pending_review`.
Changing `endpoint`, `population`, `dose`, or `direction` even slightly
produces a **new** finding row rather than updating the old one, because
those fields are part of the dedup key.

---

## 4. Generation workflow — using a cheaper model

Data packs are designed to be produced by a cheap, fast model (Claude Haiku,
GPT-mini class) rather than hand-typed. The ready-to-paste prompt templates
are in [`prompts/`](prompts/):

- [`prompts/substances.md`](prompts/substances.md)
- [`prompts/brands.md`](prompts/brands.md)
- [`prompts/stacks.md`](prompts/stacks.md)
- [`prompts/sources-and-findings.md`](prompts/sources-and-findings.md)

### Chunking guidance

Generate in small batches, not one giant pack:

- **Substances**: 20–40 per generation call.
- **Brands**: 10–20 per call (each brand can carry several products with
  ingredients — output gets long fast).
- **Stacks**: 30–50 per call (each row is small).
- **Sources + findings**: **one substance's worth per call** — see the golden
  rule below.

Why smaller batches beat one giant call:

- A cheap model's error rate (bad enum value, missing required field, wrong
  JSON shape) is roughly constant *per row*, not per call. A 200-row pack
  with a 2% row error rate has ~4 broken rows buried in a wall of JSON. A
  20-row pack has ~0.4 — usually zero, and when there's one, it's fast to
  spot in the Import preview and fix.
- Import preview (see §5) shows every row's status. Reviewing 20–40 rows at a
  time is tractable; reviewing 200 is not.
- If a call fails outright (truncated output, model refuses part of the
  request), you lose a 20-row batch, not a 200-row one.
- Smaller prompts fit comfortably under context limits even for a
  cheap/small model, which reduces truncation risk in the first place.

### The golden rule for findings: never generate from memory

**The model must only extract findings from real source material the
operator pastes into the prompt** — an abstract, a PMID, a DOI, a citation.
Never ask a model to "write findings about substance X" from its own
training-time knowledge.

This matters because a model asked to produce a specific PMID + a specific
effect size + a specific study population, with nothing to ground it, will
confidently invent all three. That's exactly how hallucinated citations get
into a research database — and once a `research_findings` row exists with a
fabricated-but-plausible PMID, it's very hard to catch later. See
[`prompts/sources-and-findings.md`](prompts/sources-and-findings.md) — it is
built around this constraint: the operator pastes the abstract + citation
metadata in, and the model may only summarize what's in that pasted text.

### Sources can be safely batch-generated — with one condition

Unlike findings, a list of **sources** (title/authors/journal/year/PMID/DOI,
no interpretive summary) can be produced in a larger batch from a citation
list, *because* there's no room for the model to invent an effect or a
number — it's just restating bibliographic metadata. But this is only safe
if every PMID/DOI is **verified against PubMed before import**, because a
model can still transpose or invent a PMID.

Verification step: look up each PMID with PubMed's E-utilities `esummary`
endpoint and confirm title/authors/year match what the model produced:

```
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=<PMID>&retmode=json
```

If the title doesn't match, drop or fix the row before importing — do not
import an unverified PMID.

### Language guardrails (must appear in every generation prompt)

StackAtlas is not a dosing authority and does not give medical advice. Never
write, and never let a generated pack contain:

- "recommended dosage" → use **"reported dose ranges"** / **"commonly
  discussed dose ranges"**
- "best" / "proven" / "safe" / "effective" / "works" → describe what was
  *reported* or *observed*, not what is endorsed
- side effects framed as certainties → **"reported side effects"** /
  **"possible risks"**
- pairing suggestions framed as advice → **"possible pairings"**

Findings summaries must be cautious and explicitly source-backed, e.g. *"In a
2019 randomized trial of 45 adults, ..."* — not *"Substance X reduces
anxiety."* The four prompt templates in `prompts/` have this guardrail text
inlined; keep it if you adapt them.

---

## 5. Import workflow in the app

**Admin → Research → Import**:

1. **Load** — paste or upload the pack JSON. The app parses the envelope
   (`kind` / `schema_version`) and, per entity, resolves natural keys against
   what's already in the database plus what's earlier in the same pack.
2. **Review statuses** — every row gets one of:
   - `ready` — will import (insert or update).
   - `exists` — natural key already in the database; will **update/link**,
     not insert as new.
   - `duplicate_in_pack` — this natural key already appeared earlier in the
     *same* pack; the later row is skipped (first occurrence wins).
   - `invalid` — has at least one error-severity issue (missing required
     field, bad enum value, stack with <2 or >10 components, finding with no
     resolvable source, etc.) — will be **skipped**, not imported.

   Rows can also carry non-fatal **warnings** (e.g. an unresolved pairing
   slug) without being marked invalid — those still import.
3. **Import** — only `ready` and `exists` rows are sent to the server-side
   RPCs, in entity order (substances → brands → stacks → sources →
   findings). The result is one `research_import_batches` row recording
   counts, plus per-row errors/warnings for anything the server itself
   rejected (the client-side preview and the server's own checks are meant
   to agree, but the server is the final authority).

Findings imported this way always start `pending_review` — someone still has
to review them in the findings moderation view before they're visible as
approved research.

---

## 6. Examples

- [`examples/sample-pack.json`](examples/sample-pack.json) — a small, valid
  pack (3 substances, 1 brand with a product, 1 stack, 2 real/verified
  sources, 2 cautious source-backed findings). Good for a first test import.
- [`examples/broken-pack.json`](examples/broken-pack.json) — deliberately
  invalid, one problem per row, for exercising the validator/preview UI.
