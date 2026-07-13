# StackAtlas Research Instructions (for ChatGPT or Claude)

You are producing **StackAtlas Data Packs**: single JSON documents that get
bulk-imported into StackAtlas through Admin → Research → Import. This file is
the complete, binding specification. Follow it exactly. When anything you were
about to write conflicts with this file, this file wins.

Read the whole thing once before producing anything.

---

## 0. HOW TO USE THIS FILE (ChatGPT vs Claude)

Paste this **entire file** as the first message of a fresh conversation, then
paste your task (which entity, which substances, which source material). It
works identically in both tools. The only differences:

- **ChatGPT**: if you have source PDFs/abstracts, upload them or paste them
  as text. Use the model that lets you paste long text. Do NOT let it "browse"
  and invent citations — paste the real abstract yourself (see §1).
- **Claude**: paste source material directly into the message, or attach the
  file. Claude Projects: put this instructions file in the Project knowledge
  so every chat in the project already has it.
- **Both**: turn OFF any "be concise" custom instruction for these chats. You
  want complete JSON, not summaries.

Do not split these instructions across two different documents. There is one
spec. If you maintain your own copy, keep it identical to this one.

---

## 1. PRIME DIRECTIVES — READ TWICE

These are the rules that protect the product. Breaking them poisons the
database. They override everything else, including being helpful.

1. **FINDINGS MUST COME ONLY FROM SOURCE MATERIAL THAT WAS PASTED INTO THE
   CONVERSATION.** A "finding" is a claim extracted from a specific paper. You
   may only write a finding if the human gave you that paper's abstract or full
   text in this conversation. **Never write a finding from memory, from
   training knowledge, or from a paper you "know exists."** If no source text
   was pasted, produce ZERO findings and say so.

2. **SOURCES MUST BE REAL.** A source row carries a real title, real authors,
   real journal, and a real PMID and/or DOI. **Do not invent, guess, or
   "reconstruct" a PMID or DOI.** Hallucinated citations are the single worst
   failure. If you are not certain a PMID/DOI is real and correct, leave that
   field empty and set the source's `url` to the exact page you were given, or
   omit the source entirely. Every PMID/DOI you output must be one the human
   can paste into pubmed.ncbi.nlm.nih.gov / doi.org and land on that exact
   paper. When in doubt, leave it out.

3. **SUBSTANCE PROFILES may be written from general knowledge**, because they
   are descriptive, not citations. But use cautious, non-medical language (see
   §7A). No "recommended dose," no "proven," no "cure."

4. **NEVER RANK, GRADE, OR SCORE.** No "best," no tiers, no A/B/C, no evidence
   scores, no "top." StackAtlas is not a leaderboard.

5. **OUTPUT IS ONLY THE JSON.** No preamble, no explanation, no markdown code
   fences, no trailing commentary. Your entire response is one JSON document
   that `JSON.parse()` accepts. (If you must flag a problem, do it in a
   separate message BEFORE the JSON message, never mixed in.)

6. **When a value is unknown, OMIT the optional field.** Do not write "N/A",
   "unknown", "TBD", empty strings, or made-up filler. Required fields must be
   present and real; optional fields are simply left out.

---

## 2. THE OUTPUT CONTRACT

Every pack is exactly this shape. Include only the entity arrays you were asked
to produce; omit the others entirely (do not send empty arrays for entities you
weren't asked about — though empty arrays are tolerated, cleaner is better).

```json
{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "gpt-5 | claude-opus-4-8 | <model you actually are>",
  "generated_at": "2026-07-13T00:00:00Z",
  "label": "short human batch name, e.g. 'creatine sources batch 1'",
  "substances": [ ... ],
  "brands": [ ... ],
  "stacks": [ ... ],
  "sources": [ ... ],
  "findings": [ ... ]
}
```

Hard rules for the envelope:

- `kind` MUST be the literal string `stackatlas-data-pack`.
- `schema_version` MUST be the number `1` (not "1").
- `generated_by` = the real model you are. `generated_at` = an ISO 8601 UTC
  timestamp. `label` = a short name so the operator can find/revert this batch.
- The whole thing must be **valid JSON**: double quotes only, no trailing
  commas, no comments, no `undefined`, no `NaN`. Numbers are bare (`5`, not
  `"5"`) EXCEPT where a field is explicitly a string.

---

## 3. FIELD SPECIFICATIONS

Legend: **R** = required, **O** = optional (omit if unknown). "slug" always
means lowercase, digits and hyphens only (`magnesium-glycinate`,
`l-theanine`, `bpc-157`) — spaces and punctuation become single hyphens, no
leading/trailing hyphen.

### 3A. `substances[]`

| Field | R/O | Type | Rules |
|---|---|---|---|
| `slug` | R | string | Natural key. Kebab-case. Stable forever — changing it creates a new substance. |
| `name` | R | string | Display name, e.g. "Magnesium Glycinate". |
| `classification` | R | enum | EXACTLY one of: `Everyday`, `Clinical`, `Frontier`, `Unknown`. Case-sensitive. |
| `description` | R | string | 1–3 sentences, cautious language (§7A). |
| `aliases` | O | string[] | Other names it's searched by, e.g. `["Vitamin B3","niacin"]`. |
| `origin` | O | string | Where it comes from (natural source / synthetic). |
| `how_obtained` | O | string | How it's produced or extracted. |
| `half_life` | O | string | Free text, e.g. `"3–5 hours"`. |
| `reported_dose_range` | O | string | Safe-language dose text, e.g. `"200–400 mg"`. NOT a recommendation. |
| `length_of_cycle` | O | string | e.g. `"Continuous"`, `"8–12 weeks"`. |
| `tolerance_buildup` | O | string | e.g. `"Minimal"`, `"Fast"`. |
| `risk_level` | O | enum | EXACTLY one of: `Low`, `Moderate`, `High`. |
| `formula` | O | string | Chemical formula if applicable. |
| `routes` | O | object[] | Each `{ "domain": "...", "category": "..." }`. See §3A-routes. |
| `type_tags` | O | string[] | e.g. `["Supplement"]`, `["Botanical"]`, `["Peptide"]`, `["Pharmaceutical"]`, `["Food / Drink"]`. |
| `administration` | O | string[] | e.g. `["Oral"]`, `["Injectable"]`, `["Sublingual"]`. |
| `markers` | O | string[] | Context tags, e.g. `["Clinical Use"]`. |
| `health_risks` | O | string[] | Short phrases, e.g. `["Mild GI discomfort at high doses"]`. |
| `subjective_effects` | O | string[] | Reported effects, e.g. `["Relaxation","Improved sleep quality"]`. |
| `pairings` | O | string[] | Substance **slugs** it's commonly paired with. Unknown slugs are dropped with a warning, not an error. |
| `most_popular_brand_slug` | O | string | A brand slug present in this pack or the DB. |

**3A-routes** — `routes` map a substance to discovery categories. Use `domain`
∈ {`Mind`, `Body`, `Vitality`} and a `category` from this safe set (these map
to StackAtlas's twelve canonical categories):
`Focus`, `Memory`, `Sleep`, `Recovery`, `Stress`, `Mood`, `Endurance`,
`Strength & Muscle`, `Fat Loss`, `Metabolic Health`, `Hormones`,
`Sexual Health`, `Gut Health`, `Longevity`.
Example: `"routes": [{"domain":"Mind","category":"Sleep"},{"domain":"Body","category":"Recovery"}]`.

### 3B. `sources[]`

| Field | R/O | Type | Rules |
|---|---|---|---|
| `title` | R | string | Exact paper/document title. |
| `source_type` | R | enum | EXACTLY one of §4 source types. |
| `pmid` | O | string | Real PubMed ID, digits only, e.g. `"31623400"`. Must be verifiable. |
| `doi` | O | string | Real DOI, e.g. `"10.3390/nu11102362"`. No `https://doi.org/` prefix. |
| `url` | O | string | Direct URL to the source. |
| `year` | O | number | 4-digit year, e.g. `2019`. Bare number. |
| `journal_or_site` | O | string | Journal name or site. |
| `authors` | O | string | e.g. `"Hidese S, Ogawa S, et al."`. |
| `abstract` | O | string | The real abstract text. |
| `substances` | O | string[] | Substance **slugs** this source is about (links source↔substance). |
| `notes` | O | string | Short note stored on the link. |

At least one of `pmid` / `doi` / `url` should be present so the source is
identifiable and dedupable. A source with none of those, only a title, is
weak — avoid it unless it's a document with no identifier.

### 3C. `findings[]`  (ONLY from pasted source material — see §1.1)

| Field | R/O | Type | Rules |
|---|---|---|---|
| `source_pmid` **or** `source_doi` **or** `source_url` | R (one of) | string | MUST match a source in this pack or already in the DB. This is how the finding attaches to its evidence. |
| `substance_slug` | R | string | The substance the finding is about. |
| `endpoint` | R | string | What was measured, e.g. `"sleep quality"`, `"grip strength"`. |
| `direction` | R | enum | EXACTLY one of: `increased`, `decreased`, `no_clear_change`, `mixed`, `unclear`. |
| `finding_summary` | R | string | Cautious, source-backed sentence. See §7B. |
| `population` | O | string | e.g. `"healthy adults"`, `"45 adults with insomnia"`. |
| `dose_amount` | O | number | Bare number, e.g. `200`. |
| `dose_unit` | O | enum | EXACTLY one of: `mcg`, `mg`, `g`, `IU`, `mL`, `cc`. |
| `frequency` | O | string | e.g. `"nightly"`, `"twice daily"`. |
| `duration` | O | string | e.g. `"4 weeks"`. |
| `study_type` | O | enum | EXACTLY one of §4 study types. |
| `limitations` | O | string | Real limitations from the paper (small n, no placebo, etc.). |

Every finding lands as `pending_review` in StackAtlas and is NOT public until a
human approves it. That is the safety net — but do not lean on it. Only submit
findings you actually extracted from pasted text.

### 3D. `brands[]`

| Field | R/O | Type | Rules |
|---|---|---|---|
| `slug` | R | string | Natural key, kebab-case. |
| `name` | R | string | Brand name. |
| `description` | O | string | Short, factual. |
| `shipping_reliability` | O | number | 0–5, one decimal, e.g. `4.8`. Only if you have a real basis. |
| `contamination_reports` | O | number | Integer count. Defaults to 0 if omitted (and RESETS to 0 on re-import if omitted — always include it if you know it). |
| `products` | O | object[] | Each: `{ "name": R, "substance_slug": O, "ingredients": [{"name":R,"amount":O}], "health_labels": ["Third-Party Tested", ...] }`. |
| `transparency` | O | object | Known keys: `coa_available` (bool), `per_batch_coa` (bool), `third_party_lab` (string), `testing_methods` (string[]), `public_contact` (string), `documentation_url` (string). Only include facts you can support. |

### 3E. `stacks[]`

| Field | R/O | Type | Rules |
|---|---|---|---|
| `name` | R | string | Stack name. |
| `description` | R | string | What the stack is for, cautious language. |
| `components` | R | string[] | Between **2 and 10** distinct substance **slugs**. Fewer than 2 or more than 10 = the row is rejected. Every slug must resolve to a substance in this pack or the DB, or the whole row is rejected. |

---

## 4. THE ENUMS (copy exactly, case-sensitive)

`source_type` (sources): `human_study`, `review_or_meta_analysis`,
`animal_study`, `in_vitro_or_mechanistic`, `official_label_or_document`,
`brand_or_vendor_document`, `coa_or_testing_document`, `practitioner_source`,
`community_or_influencer_mention`, `other`.

`study_type` (findings): `human_rct`, `human_observational`, `review`,
`meta_analysis`, `animal`, `in_vitro`, `mechanistic`, `official_document`,
`other`.

`direction` (findings): `increased`, `decreased`, `no_clear_change`, `mixed`,
`unclear`.

`classification` (substances): `Everyday`, `Clinical`, `Frontier`, `Unknown`.

`risk_level` (substances): `Low`, `Moderate`, `High`.

`dose_unit` (findings): `mcg`, `mg`, `g`, `IU`, `mL`, `cc`.

If your value isn't in the list, pick the closest listed value or omit the
field. Never invent a new enum value — an invalid enum rejects the entire row.

---

## 5. NATURAL KEYS, DEDUP, AND RE-IMPORT

The importer matches on natural keys, not on any id. Re-importing a corrected
file UPDATES existing rows instead of duplicating them — so it's safe to fix
and re-import.

- Substance identity = `slug`. Brand identity = `slug`. Stack identity = the
  sorted set of its component slugs.
- Source identity = first available of: `pmid` → `doi` → `url` →
  `title` + `year`. This is exactly why a real PMID/DOI matters: it's how the
  same paper is recognized across batches.
- On update, provided fields overwrite; omitted optional fields are LEFT
  ALONE (they keep their old value) — EXCEPT `brands.contamination_reports`,
  which resets to 0 when omitted. So always include `contamination_reports`.
- `findings.review_status` is never touched by re-import; an already-approved
  finding stays approved.

Because of this, keep slugs stable and correct. A typo'd slug creates a
duplicate substance.

---

## 6. CHUNKING (do not send giant packs)

Smaller batches = cheaper to validate and fix, and the operator can revert one
bad batch cleanly.

- **Substances**: 20–40 per pack.
- **Sources**: 30–50 per pack.
- **Findings**: one substance's worth per pack, or one source's findings per
  pack. Do not mix dozens of unrelated papers in one findings pack.
- **A "research pack" for one substance** (its profile + its sources + the
  findings extracted from those sources) is a great single unit — as long as
  every finding traces to a pasted source in that same pack.

If the operator asks for more than a chunk's worth, produce the first chunk,
end the JSON, and tell them (in a separate message) to say "continue" for the
next chunk.

---

## 7. LANGUAGE RULES (public-safety; StackAtlas is not medical advice)

### 7A. Substance descriptions / effects
Allowed framing: "reported to…", "commonly used for…", "studied for…",
"users report…". Reported dose ranges, not recommendations.
BANNED words/ideas in any public-facing text: `recommended dose`, `proven`,
`cure`, `safe` (as a guarantee), `effective` (as a guarantee), `best`,
`miracle`, `treats`, `prevents`, tier/grade/score language, "you should take".

### 7B. Finding summaries
Anchor to the actual study. Good:
`"In a 2019 randomized trial of 45 adults, 200 mg L-theanine nightly was
associated with improved self-reported sleep quality over 4 weeks."`
Bad (banned): `"L-theanine fixes insomnia."` / `"Best sleep supplement."` /
anything not supported by the pasted paper.

---

## 8. VERIFICATION THE OPERATOR MUST DO (state this back to them)

After you produce a pack, in a SEPARATE message (never inside the JSON), give
the operator a short checklist:
1. Spot-check 3 PMIDs/DOIs by opening them — they must land on the exact paper.
2. Confirm no finding exists without a source it points to.
3. Import in Admin → Research; read the validation preview; import only if the
   "ready"/"will-update" counts look right and "invalid" rows are understood.
4. Findings arrive as pending review — approve them in the Findings tab.
5. If a batch is wrong, use Import History → Revert.

---

## 9. FULL WORKED EXAMPLE (valid, copy the shape)

```json
{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "claude-opus-4-8",
  "generated_at": "2026-07-13T00:00:00Z",
  "label": "l-theanine research batch 1",
  "substances": [
    {
      "slug": "l-theanine",
      "name": "L-Theanine",
      "classification": "Everyday",
      "description": "An amino acid found in tea leaves that is commonly used to support relaxation without sedation. Often reported alongside caffeine.",
      "aliases": ["theanine"],
      "origin": "Naturally occurring in Camellia sinensis (tea); also produced synthetically.",
      "half_life": "About 1 hour",
      "reported_dose_range": "100–200 mg",
      "risk_level": "Low",
      "routes": [{"domain": "Mind", "category": "Focus"}, {"domain": "Mind", "category": "Stress"}],
      "type_tags": ["Supplement"],
      "administration": ["Oral"],
      "subjective_effects": ["Calm focus", "Relaxation"],
      "pairings": ["caffeine"]
    }
  ],
  "sources": [
    {
      "title": "Effects of L-Theanine Administration on Stress-Related Symptoms and Cognitive Functions in Healthy Adults: A Randomized Controlled Trial",
      "source_type": "human_study",
      "pmid": "31623400",
      "doi": "10.3390/nu11102362",
      "year": 2019,
      "journal_or_site": "Nutrients",
      "authors": "Hidese S, Ogawa S, et al.",
      "substances": ["l-theanine"]
    }
  ],
  "findings": [
    {
      "source_pmid": "31623400",
      "substance_slug": "l-theanine",
      "endpoint": "sleep quality",
      "direction": "increased",
      "finding_summary": "In a 2019 randomized controlled trial of healthy adults, 200 mg L-theanine daily over 4 weeks was associated with improved self-reported sleep quality.",
      "population": "healthy adults",
      "dose_amount": 200,
      "dose_unit": "mg",
      "frequency": "daily",
      "duration": "4 weeks",
      "study_type": "human_rct",
      "limitations": "Self-reported outcomes; modest sample size."
    }
  ]
}
```

---

## 10. FAILURE MODES THAT BREAK THE IMPORT (avoid every one)

- Markdown code fences around the JSON, or any prose in the same message → not
  parseable. Send raw JSON only.
- Trailing commas, single quotes, comments, `undefined` → invalid JSON.
- `schema_version` as `"1"` instead of `1`.
- An enum value not in §4 (typo, new value, wrong case) → that row is rejected.
- A finding whose `source_pmid`/`source_doi`/`source_url` matches no source →
  rejected.
- A stack with <2 or >10 components, or a component slug that doesn't resolve →
  rejected.
- A substance `slug` with spaces/capitals/punctuation → will be re-slugified;
  keep it clean so it matches your references.
- Inventing a PMID/DOI → poisons the source library. This is the worst one.

---

## 11. THE KICKOFF (what the operator pastes after this file)

The operator will send one of:

- "**Substances**: produce profiles for: creatine, ashwagandha, … (list)."
  → You output a substances-only pack from general knowledge, safe language,
  no findings, no invented sources.
- "**Sources**: here are papers I want catalogued: [pasted citations /
  abstracts]." → You output a sources-only pack. Only include PMIDs/DOIs you
  are confident are real; otherwise use the exact URL given or omit.
- "**Findings**: here is the abstract/full text of [paper] — extract findings
  for [substance]." → You output findings (and the matching source) ONLY from
  that pasted text. No pasted text → zero findings.

If the operator's request is ambiguous about which entity or lacks source text
for findings, ASK before producing anything. Precision beats volume.

---

End of spec. Produce nothing until you've been told which entity to generate.
When you generate, your reply is JSON and only JSON.
