# Feedback on the Foundation Release corpus — paste into ChatGPT

Paste everything between the `=====` lines into the ChatGPT conversation that
built `StackAtlas_Research_Corpus_Foundation_20260712.zip` (or a fresh
conversation with the same corpus-building context). It tells the model
exactly what worked, what didn't, and what to produce differently next time.

---

===== BEGIN PROMPT =====

I imported the Foundation Release corpus into StackAtlas. Here's a full
review — what to keep doing, and what has to change before the next
release. Read all of it before generating anything new.

## What was genuinely good — keep doing this

- **785 deduplicated substances across 15 taxonomy domains** is a real,
  usable foundation. Structural discipline (sequential catalog IDs, no
  duplicate canonical names, controlled category vocabulary) meant the whole
  set converted cleanly with zero parse errors.
- **The evidence-layer discipline is exactly right.** Separating mechanism
  from clinical result from company claim from influencer protocol from
  community anecdote is the single most important thing this corpus does
  well, and it's the reason it's usable at all. Do not lose this in future
  releases.
- **Zero banned-language violations.** I scanned every generated field for
  "recommended," "proven," "best," "safe," "effective" — none appeared. The
  dose-language discipline ("reported dose ranges," not recommendations) is
  correct and matches StackAtlas's public-facing rules exactly.
- **The legal/availability flag vocabulary is well thought out** —
  FOOD / SUPPLEMENT-MARKETED / RX-DRUG / CONTROLLED-SI–SV /
  FDA-UNAPPROVED / WADA-PROHIBITED / RESEARCH-ONLY-GRAY etc. — and it's
  genuinely useful signal. I used it to derive each substance's
  classification tier, and it worked.
- **The Living Source Directory's three-tier structure** (literature/trial
  discovery vs. evidence-interpretation databases vs. named
  public-figure/community sources, each with an explicit epistemic caveat)
  is exactly the right way to catalog "monitor and evaluate, not endorse"
  sources. Keep this structure.
- **The numbered source key (S01–S23) tied to real organizations** (NIH
  ODS, FDA, PubChem, WADA, DEA, DailyMed, LPSN, ISAPP) gave me 35 real,
  checkable reference sources for free. Good bibliographic hygiene.
- **The "Known limits" and "Recommended expansion sequence" sections** are
  honest about coverage gaps instead of implying completeness. Keep writing
  these.

## What broke on import — this is the priority fix

**The core problem: none of the output matches StackAtlas's actual import
schema.** I had to build a lossy conversion script to make any of it usable,
and most of the value in the five large Markdown files (the deep profiles,
~680 source URLs, the stacks/brands file) is still stuck in unstructured
prose that the importer cannot use at all.

Specifically:

1. **The CSV used an invented column schema**
   (`catalog_id,canonical_name,aliases,category,subcategory,origin_type,
   use_context_tags,us_availability_legal_flag,priority,sources`) instead
   of the real Data Pack v1 substance schema. Go read
   `docs/data-packs/CHATGPT_ZIP_INSTRUCTIONS.md` (or ask me to paste it
   again) — that document IS the schema. Every future release must produce
   files matching that document exactly, not a self-invented format.

2. **No `description` field — the single most important required field.**
   Every substance needs a real `description` (required, non-empty). It was
   missing entirely. I had to synthesize a placeholder from `subcategory` +
   `origin_type` + `category`, which produces terse, mechanical text like
   *"Vitamin A ester. Retinol fatty-acid ester. Catalog domain: Nutrient."*
   — not the descriptive prose a substance page actually needs. **Every
   substance row needs 1–3 real sentences of neutral, cautious description**,
   not taxonomy metadata dressed up as a description.

3. **No `classification` field using the real enum** (`Everyday` /
   `Clinical` / `Frontier` / `Unknown`). I had to *infer* it from legal
   flags and category text — lossy, and wrong in ambiguous cases (borderline
   RX-DRUG-but-common-supplement items, for instance). **Assign
   classification directly and explicitly per substance**, don't make me
   derive it from other fields.

4. **No `risk_level` (`Low`/`Moderate`/`High`), no `reported_dose_range`.**
   The field map document even *describes* a `reported_dose_ranges` concept,
   but the CSV never actually included it. If you're going to describe a
   field in the field map, populate it.

5. **Zero structured findings, despite 680+ cited URLs.** The five deep-dive
   Markdown files contain rich, source-backed claims in prose — but
   StackAtlas findings must be discrete rows: one endpoint, one direction
   (increased/decreased/no_clear_change/mixed/unclear), one cautious
   source-backed summary, tied to one specific source by PMID/DOI/URL. None
   of that prose converts automatically. **Every claim worth keeping needs
   to also exist as a `findings[]` row in JSON**, pointing at a real,
   verifiable source citation — not just live as a paragraph in a Markdown
   file.

6. **The "05_STACKS_AND_BRAND_INTELLIGENCE.md" file has no structured
   stacks or brands data** — 46 stack patterns and 50+ brands exist only as
   prose. StackAtlas has real `stacks[]` (name, description, 2–10 component
   substance slugs) and `brands[]` (slug, name, transparency fields, product
   list) schemas. **Produce these as structured JSON, not narrative.**

7. **No JSON output at all**, despite the field map and my instructions
   explicitly specifying Data Pack v1 JSON as the primary format for
   substances/brands/stacks/findings (CSV is for sources-only lists;
   Markdown is for standalone documents). **Substances, brands, stacks, and
   findings belong in `.json` files following the exact envelope in
   `CHATGPT_ZIP_INSTRUCTIONS.md`** — `kind`, `schema_version`, then the five
   arrays.

## What to do differently for the next release

1. Before generating anything, re-read the schema doc I'm going to paste
   below (or ask me for it) and use its field names, enums, and JSON
   envelope EXACTLY — no invented column names, no aspirational schema that
   isn't the real one.
2. Every substance needs: `slug`, `name`, `classification` (explicit, not
   inferred), `description` (real prose, 1–3 sentences), and as many of the
   optional fields as you can responsibly fill in (`risk_level`,
   `reported_dose_range`, `half_life`, `health_risks`, `subjective_effects`,
   `type_tags`) from what you actually know or from the deep-profile
   research you already did.
3. Convert at least the highest-priority (P1) substances' deep-profile
   content into real `findings[]` rows — each one tied to a real,
   double-checked PMID/DOI/URL, one measured endpoint per row, never
   invented from memory (this rule doesn't change).
4. Convert the stacks and brand sections into structured `stacks[]` and
   `brands[]` JSON.
5. Keep everything else — the evidence-layer discipline, the source
   directory, the language guardrails, the honesty about coverage limits.
   Those were the best parts of this release and nothing about the format
   fix should touch them.

Confirm you understand the gap between "well-researched" (this release:
yes) and "matches the import schema" (this release: no), then ask me for
the current `CHATGPT_ZIP_INSTRUCTIONS.md` before generating the next batch.

===== END PROMPT =====
