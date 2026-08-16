# StackAtlas — Claude Deep Research Instructions

**How to use this file:** paste this ENTIRE document as the first message of a
Claude chat (regular claude.ai, ideally with Research/browsing on), then state
the assignment — which substances, topics, or gaps to research. Claude treats
this document as the binding spec. It is self-contained: taxonomy, file
format, quality rules, and known failure modes are all in here. If anything in
it ever conflicts with `CHATGPT_ZIP_INSTRUCTIONS.md`, that file wins on file
format and this one wins on taxonomy.

---

## 0. The job

You are producing research data for **StackAtlas**, a community platform for
supplements, peptides, and nootropics. Your output gets imported into a real
database through a strict importer. You produce two deliverables, in order:

- **Deliverable A — the evidence dossier.** The result of your actual
  research: sources found, identifiers verified, key result sentences quoted
  verbatim, and an honest account of evidence quality.
- **Deliverable B — the import files.** JSON data packs (and optionally CSV /
  Markdown) matching the exact schema in §5, derived only from Deliverable A.

Do not skip A and jump to B. Every finding in B must trace to a quoted
sentence in A.

## 1. Read this history first — why these rules exist

A previous research batch (built by another AI's research mode) was
well-researched and almost unusable. What went wrong, concretely:

1. It invented its own CSV column schema instead of using the real one — the
   entire batch needed a lossy conversion script.
2. It omitted `description`, the single most important required field, so
   every substance page got mechanical placeholder text.
3. It omitted `classification` and `risk_level`, which then had to be
   *inferred* — wrongly, in edge cases.
4. It cited 680+ source URLs but produced **zero structured findings** — all
   the value was locked in prose the importer cannot read.
5. Stacks and brands existed only as narrative, not as structured rows.
6. It described fields in its own "field map" that it never actually
   populated.
7. It used a 15-domain taxonomy of its own invention instead of the site's
   real 13 categories.

Every rule below exists because one of these actually happened. "Well
researched" and "importable" are different properties; you are being asked
for both.

## 2. Prime directives (override everything, including helpfulness)

1. **Never invent an identifier.** Every PMID/DOI you output must be copied
   verbatim from a PubMed page or doi.org landing page you actually opened
   during this conversation. The test: a human pastes it into
   pubmed.ncbi.nlm.nih.gov or doi.org and lands on exactly that paper. If you
   are not certain, leave the field empty and give the exact URL instead —
   or drop the source. One invented PMID poisons the whole batch.
2. **Findings come only from sources you actually opened and read.** Not from
   memory, not from a search-result snippet, not from an abstract you "know."
   Quote the supporting sentence in the dossier. No opened source → no
   finding. A batch with many sources and few findings is fine.
3. **Substance descriptions may come from general knowledge** — they are
   descriptive, not citations. Cautious, neutral, non-medical language.
4. **Never rank, grade, or score.** No "best," no tiers, no A/B/C grades, no
   evidence scores, no "top 10." StackAtlas is not a leaderboard.
5. **Cautious language everywhere.** Banned words in any generated field:
   *recommended, proven, best, safe, effective, cure*. Doses are "reported
   dose ranges," never recommendations. Prefer "was associated with,"
   "reported," "in this trial" over "boosts," "supports," "enhances."
6. **The schema is law.** Use the exact field names, enums, and envelope in
   §5. If a piece of data has no field, put it in `notes` or drop it — never
   invent a field, column, category, tag, or enum value.
7. **When uncertain, omit and say so.** The uncertainty report (§8) is a
   required deliverable. A visible gap is fine; a confident guess is not.

## 3. Research phase — before writing any JSON

Work from primary literature: PubMed, doi.org, journal pages, and official
regulator documents. Prefer, in order: newest systematic reviews and
meta-analyses of human trials → individual human RCTs → human observational
studies → official/regulatory documents → animal studies → in-vitro and
mechanistic work.

For every source you keep, capture in the dossier: title, authors, journal,
year, PMID and/or DOI (verbatim), the URL of the page you opened, its
`source_type` (§5), and the exact sentence(s) supporting each finding you
will extract.

**Deep-research traps — all of these have burned us:**

- **Aggregators are not sources.** SEO supplement blogs, Healthline-style
  articles, press releases, and database summaries (Examine etc.) are not
  study sources. If they cite a paper, open the paper and cite the paper.
- **Check for retractions.** PubMed shows retraction notices; a retracted
  paper is excluded, full stop. Note the exclusion in the dossier.
- **Preprints** (bioRxiv/medRxiv) are allowed only as `source_type: "other"`
  with `notes` saying "preprint, not peer-reviewed." Never as `human_study`.
- **One paper = one source.** Its PubMed entry, journal page, and PDF are
  the same source, not three.
- **Don't stack subsumed primaries.** If a meta-analysis you cite already
  covers five older RCTs, cite the meta-analysis plus at most the one or two
  most load-bearing primaries — not all five.
- **Vendor "clinical studies" pages** are `brand_or_vendor_document` and may
  support product/brand facts only, never efficacy.
- **Community content** (Reddit, forums, podcasts, influencers) is
  `community_or_influencer_mention`: experience signal only, never efficacy.
- **Null results are wanted.** A trial that found no clear change is a
  finding (`direction: "no_clear_change"`) — include it; null results keep
  the site honest.
- **Recency matters.** Note in the dossier when the newest human evidence is
  older than ~10 years — don't silently present old evidence as current.

## 4. The taxonomy (fixed — never invent values)

### 4.1 Categories (goal routes) — 13, exactly these

Route each substance to **0–3** categories as `{"domain": D, "category": C}`
pairs, strings exactly as written:

- **Mind:** Cognition | Recovery | Mood & Stress
- **Body:** Performance | Pain & Injury | Joint & Mobility | Beauty & Skin
- **Vitality:** Longevity | Metabolic Health | Hormonal Health | Digestive
  Health | Heart Health | Immune Health

Routing rules:

1. A category answers *"what do people honestly take this FOR?"* — never
   chemistry, never marketing claims. Route by evidence-backed or predominant
   real-world use.
2. 0–3 routes; one clear purpose = one route. Do not fill all three slots by
   default.
3. **Do not force a route.** Plain electrolytes and structural amino acids
   (l-alanine, l-serine) stay unrouted — that is a valid, intentional state.
4. Gray-market and psychoactive compounds are **not** a special case: route
   them by honest predominant use like anything else (testosterone cypionate
   → Hormonal Health); unrouted only when no honest goal exists.
5. Domain follows category from the table — there is no "Body / Cognition."

**Legacy category names that must NEVER appear** (if your source material or
older StackAtlas exports use them, map them): Memory → Cognition · Focus →
Cognition · Sleep → Recovery · Stress → Mood & Stress · Mood → Mood & Stress ·
Strength & Muscle → Performance · Endurance → Performance · Body/Recovery →
Mind/Recovery · Fat Loss → Metabolic Health · Hormones → Hormonal Health ·
Sexual Health → Hormonal Health · Gut Health → Digestive Health.

### 4.2 Type tags — what it IS

Exactly six exist: `supplement`, `botanical`, `food-drink`, `pharmaceutical`,
`peptide`, `research-compound`. Pick one primary; add a second only when both
are genuinely true (ashwagandha = supplement + botanical). Approved drugs used
off-label are `pharmaceutical`, not `research-compound`.

### 4.3 Classification — how established

Exactly one of: `Everyday` (common, long safety record — grocery/health-store
territory), `Clinical` (established medical/prescription use), `Frontier`
(experimental/gray-market: research chemicals, novel peptides, SARMs),
`Unknown` (last resort; prefer a real answer). Assign it explicitly per
substance — never leave it to be inferred.

### 4.4 Risk level — how careful a reader should be

Exactly one of `Low` / `Moderate` / `High`, assigned **by substance class**:

- **Low** — vitamins, minerals, electrolytes, amino acids, common
  herbs/botanicals, probiotics, medicinal mushrooms, food-derived compounds.
- **Moderate** — pharmaceuticals used without supervision, stimulant analogs
  and nootropic drugs, sedatives, cannabinoids, psychedelics, opioid-active
  botanicals (kratom and its alkaloids), non-hormonal research peptides,
  topical prescription actives, GLP-1-class drugs.
- **High** — anabolic steroids and prohormones, SARMs, systemic hormones
  (testosterone, estrogen, thyroid, insulin, hGH, EPO), anything with serious
  dependence or acute-harm potential.

Tie between two tiers → take the **higher**. New substance similar to an
existing one → copy the sibling's tier (a new SARM is High because all SARMs
are High). Classification and risk are independent axes: caffeine is
Everyday + Moderate; BPC-157 is Frontier + Moderate (non-hormonal research
peptide — Frontier does not imply High).

### 4.5 Slugs and identity

- `slug` is the natural key: kebab-case, singular, no vendor names
  (`magnesium-glycinate`, `lion-s-mane-mushroom`).
- **Before creating a substance, check it isn't an existing one under a
  synonym.** Ashwagandha and Withania somnifera are ONE substance; the Latin
  name is an alias. Marketing names (e.g. a branded ingredient name) are
  aliases, never new slugs.
- **Salt forms, esters, and vitamers that the community treats as distinct
  products get their own slugs and stay separate substances** —
  magnesium-glycinate, magnesium-citrate, testosterone-enanthate,
  cyanocobalamin are all distinct entries. Do NOT merge them into a parent.
  But do not spawn theoretical forms nobody sells either.
- Reuse existing slugs on re-import (the importer upserts by slug). Never
  rename a slug — that creates a duplicate.

### 4.6 Bearings (only if asked for post content)

Bearings tag community **posts**, never substances. If the assignment includes
community-facing writeups, choose bearings only from the canonical list in
`TAXONOMY_MASTER_GUIDE.md` Part 1.4 — never coin new ones. Otherwise ignore
bearings entirely.

## 5. File formats (exact)

### 5.1 JSON data pack — the primary format

One JSON object per file. Substances, brands, stacks, sources, and findings
belong HERE, never in prose. Exact envelope:

```json
{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "label": "short human name for this batch",
  "generated_by": "Claude deep research",
  "substances": [],
  "brands": [],
  "stacks": [],
  "sources": [],
  "findings": []
}
```

Include only the arrays you have data for. All field names snake_case.

**substances[]** — required: `slug`, `name`, `classification`, `description`
(1–3 real sentences of neutral, cautious prose — NOT taxonomy metadata
strung together). Optional: `aliases` (string[]), `origin`, `how_obtained`,
`half_life`, `reported_dose_range`, `length_of_cycle`, `tolerance_buildup`,
`risk_level`, `formula`, `routes` (array of `{"domain","category"}`),
`type_tags` (string[]), `administration` (string[]), `markers` (string[]),
`health_risks` (string[]), `subjective_effects` (string[]), `pairings`
(string[] of substance slugs), `most_popular_brand_slug`. Fill `risk_level`,
`routes`, and `type_tags` for every substance — "optional" means the importer
tolerates their absence, not that you may skip them.

**brands[]** — required: `slug`, `name`. Optional: `description`,
`shipping_reliability` (0–5, one decimal), `contamination_reports` (integer —
always include the real number for an existing brand; omitting it on
re-import resets it to 0), `products` (array of `{"name","substance_slug",
"ingredients":[{"name","amount"}],"health_labels":[]}`), `transparency`
(object: `coa_available` bool, `per_batch_coa` bool, `third_party_lab`,
`testing_methods` string[], `public_contact`, `documentation_url`).

**stacks[]** — required: `name`, `description`, `components` (2–10 substance
slugs).

**sources[]** — required: `title`, `source_type` (exactly one of:
`human_study`, `review_or_meta_analysis`, `animal_study`,
`in_vitro_or_mechanistic`, `official_label_or_document`,
`brand_or_vendor_document`, `coa_or_testing_document`, `practitioner_source`,
`community_or_influencer_mention`, `other`). Optional: `url`, `pmid`, `doi`,
`year` (4-digit integer), `journal_or_site`, `authors`, `abstract`,
`substances` (string[] of slugs to link), `notes`. Every study source needs
PMID or DOI (URL as fallback) plus year and journal.

**findings[]** — each row is ONE measured result from ONE source about ONE
substance. Required: exactly one of `source_pmid` / `source_doi` /
`source_url` (must match a source in this same import or already in
StackAtlas); `substance_slug` (must exist in this import or the platform);
`endpoint` (what was measured, e.g. `sleep quality`); `direction` (one of
`increased`, `decreased`, `no_clear_change`, `mixed`, `unclear`);
`finding_summary` (one cautious source-backed sentence, population and dose
included when stated). Optional: `population`, `dose_amount` (number),
`dose_unit` (one of `mcg`, `mg`, `g`, `IU`, `mL`, `cc`), `frequency`,
`duration`, `study_type` (one of `human_rct`, `human_observational`,
`review`, `meta_analysis`, `animal`, `in_vitro`, `mechanistic`,
`official_document`, `other`), `limitations`.

**The `limitations` field is displayed publicly next to the finding, and it
has a hard rule:** it may contain ONLY concrete, checkable facts visible in
the source itself — the actual sample size (`n=46`, not "small sample"), the
specific population studied, a form/route mismatch (study used magnesium
oxide, finding attached to glycinate), industry funding, or a limitation the
authors themselves state. Generic filler is banned: never "small sample size"
without the number, never "more research is needed," never "results may
vary," never "individual results differ." If you have no concrete limitation
to state, OMIT the field entirely — an empty field is correct; boilerplate is
garbage that trains readers to ignore the field.

### 5.2 CSV — source lists only

Header row first; recognized columns (any subset, any order):
`title,source_type,url,pmid,doi,year,journal_or_site,authors,abstract,substances,notes`.
Multiple slugs in the `substances` cell separated by `;`. Quote cells
containing commas. No substances or findings in CSV — JSON only.

### 5.3 Markdown — one document per file

For a full write-up, protocol, or label transcription about ONE thing. Stored
verbatim as a single source. Frontmatter (`title`, `url`, `authors`, `date`,
`source_type`) improves metadata. **Markdown never creates findings** — every
claim worth keeping must ALSO exist as a findings[] row in JSON.

### 5.4 Packaging

If you can produce files, name the archive `stackatlas-import.zip`: ≤300
files, ≤10 MB per file, ≤50 MB uncompressed, no nested archives, no `..` or
absolute paths. If you cannot build files in this chat, emit each file's full
contents in its own labeled fenced code block — never truncate, never
summarize a file.

## 6. Known failure modes — do not repeat these

1. **Schema drift.** Inventing columns/fields "close to" the real ones. The
   schema in §5 is exact; anything else forces a lossy conversion.
2. **Missing `description`.** Every substance needs 1–3 sentences of real
   prose. "Vitamin A ester. Catalog domain: Nutrient." is not a description.
3. **Missing `classification`/`risk_level`.** Assign both explicitly.
4. **Prose-locked findings.** A claim that lives only in a Markdown paragraph
   does not exist to the importer. JSON findings rows or it didn't happen.
5. **Reconstructed identifiers.** A PMID from memory that's "probably right"
   is the worst possible output. Verbatim from an opened page, or empty.
6. **Mistyped sources.** A review is not a `human_study`. A brand's studies
   page is `brand_or_vendor_document`. An aggregator summary is not a source.
7. **Invented taxonomy.** No new categories, domains, tags, bearings, or enum
   values — and no legacy category names (§4.1 mapping).
8. **Synonym duplicates.** Creating `withania-somnifera` when `ashwagandha`
   exists. Check plausible existing slugs; Latin/marketing names → `aliases`.
9. **Over-routing.** Filling all 3 route slots by default, or routing
   commodity electrolytes/amino acids because a slot exists. Zero routes is a
   valid answer.
10. **Risk miscalibration.** Risk is assigned by class (§4.4), ties go
    higher, siblings match. Opioid-active botanicals are not Low because
    they're "natural."
11. **Marketing tone.** "Supports," "boosts," "optimizes," plus the banned
    words. Findings state what one source reported, nothing more.
12. **Animal/in-vitro dressed as human.** Label the study type and never
    summarize non-human results as if they applied to people.
13. **Doses without units or context.** `dose_amount` numeric + `dose_unit`
    from the enum; "reported," never "recommended."
14. **Non-atomic findings.** One endpoint, one direction, one source per row.
    "Improved sleep and reduced anxiety" is two rows.
15. **Dangling references.** Every finding's identifier must resolve to a
    source in the same batch (or known to exist on the platform); every
    `substance_slug` and stack component must exist. Orphans fail import.
16. **Broken JSON.** Smart quotes, trailing commas, comments, unescaped
    newlines, non-integer years. Mentally parse every file before delivering.
17. **Oversized ambition.** A 50-substance batch with thin data is worth less
    than 10 substances done fully. Depth beats width; say what you cut.
18. **Implied completeness.** If coverage is partial, the report says so.
    Honesty about limits is a feature of good batches, not an apology.
19. **Boilerplate `limitations`.** "Small sample size; more research needed"
    pasted on every finding is AI filler and it shows publicly on the site.
    Concrete facts from the source (real n, real population, form mismatch,
    funding) or omit the field — see §5.1.

## 7. Self-audit — run before delivering

- [ ] Every JSON file parses; envelope exact (`kind`, `schema_version: 1`).
- [ ] Every substance: slug kebab-case + name + classification + real
      description; risk_level, type_tags, routes present.
- [ ] Every route is one of the 13 canonical pairs, ≤3 per substance, no
      legacy names.
- [ ] Every enum value verbatim from §5 (source_type, direction, study_type,
      dose_unit, classification, risk_level).
- [ ] Every finding's source identifier resolves within the batch or
      platform; every substance_slug exists.
- [ ] Every PMID/DOI was copied from a page opened this conversation.
- [ ] Banned-word scan across all generated text: recommended, proven, best,
      safe, effective, cure.
- [ ] No rankings, grades, or scores anywhere.
- [ ] Null results included where found.
- [ ] Uncertainty report written.

## 8. Final reply format

1. **Files** (zip or labeled code blocks).
2. **Batch manifest** — counts per array, substances covered, sources by
   type, findings by direction.
3. **Uncertainty report** — sources excluded and why (no identifier,
   retracted, vendor-only, preprint), ambiguous substance matches left for
   human linking, fields left empty deliberately.
4. **Coverage gaps** — what a future batch should tackle next.

## 9. Worked micro-example

```json
{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "label": "example: magnesium glycinate sleep evidence",
  "generated_by": "Claude deep research",
  "substances": [
    {
      "slug": "magnesium-glycinate",
      "name": "Magnesium glycinate",
      "classification": "Everyday",
      "risk_level": "Low",
      "description": "A chelated form of magnesium bound to glycine, sold as a dietary supplement. Reported use centers on sleep quality and relaxation; human evidence for magnesium supplementation is mixed and depends on baseline magnesium status.",
      "type_tags": ["supplement"],
      "routes": [{ "domain": "Mind", "category": "Recovery" }],
      "reported_dose_range": "200–400 mg elemental magnesium daily (reported)"
    }
  ],
  "sources": [
    {
      "title": "The effect of magnesium supplementation on primary insomnia in elderly: A double-blind placebo-controlled clinical trial",
      "source_type": "human_study",
      "pmid": "23853635",
      "year": 2012,
      "journal_or_site": "Journal of Research in Medical Sciences",
      "substances": ["magnesium-glycinate"]
    }
  ],
  "findings": [
    {
      "source_pmid": "23853635",
      "substance_slug": "magnesium-glycinate",
      "endpoint": "sleep efficiency",
      "direction": "increased",
      "study_type": "human_rct",
      "population": "elderly adults with primary insomnia",
      "dose_amount": 500,
      "dose_unit": "mg",
      "duration": "8 weeks",
      "finding_summary": "In this 8-week double-blind RCT in elderly adults with insomnia, magnesium supplementation was associated with increased sleep efficiency and sleep time compared with placebo.",
      "limitations": "n=46; elderly participants only; trial used magnesium oxide, not the glycinate form"
    }
  ]
}
```

Note the last `limitations` line: when the study used a different form than
the substance you're attaching it to, SAY SO — or attach it to the correct
form instead. That level of honesty is the bar.
