# StackAtlas Taxonomy Master Guide

**What this is:** the single source of truth for how everything in StackAtlas is
categorized. Hand the paste-block at the bottom (Part 4) to ChatGPT (or any AI)
whenever you have it do research, and the output will come back matching the
site's real taxonomy — correct categories, correct bearings, correctly typed
sources — instead of made-up ones.

**How it relates to the other docs in this folder:**

- `CHATGPT_ZIP_INSTRUCTIONS.md` — the *file format* (how to build the import ZIP)
- **this file** — the *taxonomy and quality rules* (what values to use, what
  makes research good enough to import)
- `RESEARCH_INSTRUCTIONS.md` — older long-form research guidance (superseded by
  the paste-block here for day-to-day use)

---

## Part 0 — One-page cheat sheet

Every substance in StackAtlas is described on **five independent axes**:

| Axis | Question it answers | Allowed values |
|---|---|---|
| **Categories** (goal routing) | *What is it used FOR?* | 0–3 of the 12 canonical categories below |
| **Type tags** | *What IS it?* | `supplement`, `botanical`, `food-drink`, `pharmaceutical`, `peptide`, `research-compound` |
| **Classification** | *How established is it?* | `Everyday`, `Clinical`, `Frontier`, `Unknown` |
| **Risk level** | *How careful should a reader be?* | `Low`, `Moderate`, `High` |
| **Bearings** | *What topics do people discuss it under?* (posts/feed only) | see Part 1.4 |

Every source is described on **one axis**: `source_type` (10 values, Part 2.1),
plus identity fields (PMID/DOI/URL, year, journal).

Every finding needs: substance + source + `endpoint` + `direction` +
`study_type`, in cautious language.

---

## Part 1 — The substance taxonomy

### 1.1 Domains → Categories (the goal taxonomy)

Three domains, twelve categories. These are fixed — **never invent a new
category or domain**. A substance is *routed* to the categories that describe
what people actually take it for.

| Code | Domain | Category | Covers |
|---|---|---|---|
| CG | Mind | **Cognition** | Focus, memory, clarity, motivation, productivity |
| RC | Mind | **Recovery** | Sleep, soreness, fatigue, relaxation, recovery |
| MS | Mind | **Mood & Stress** | Mood, anxiety, stress, calmness, emotional resilience |
| PF | Body | **Performance** | Strength, endurance, energy, training, output |
| PI | Body | **Pain & Injury** | Pain, injury recovery, tendons, ligaments, mobility |
| JM | Body | **Joint & Mobility** | Joint health, mobility, movement quality |
| BS | Body | **Beauty & Skin** | Skin, hair, nails, acne, appearance outcomes |
| LG | Vitality | **Longevity** | Healthy aging, long-term use, antioxidant/cellular health |
| MH | Vitality | **Metabolic Health** | Weight, appetite, blood sugar, insulin, body composition |
| HH | Vitality | **Hormonal Health** | Testosterone, estrogen, thyroid, libido, fertility |
| DH | Vitality | **Digestive Health** | Digestion, gut health, bloating, microbiome |
| HT | Vitality | **Heart Health** | Blood pressure, cholesterol, circulation, heart rate |

**Routing rules:**

1. Route to **1–3 categories**, only where the use is honestly central. A
   substance with one clear purpose gets one category (tretinoin → Beauty &
   Skin). Berberine legitimately gets Metabolic Health + Digestive Health +
   Heart Health.
2. **Do not force a route.** Plain electrolytes (sodium, potassium salts),
   structural amino acids (l-alanine, l-serine), and psychedelics/research
   chemicals with no honest single goal stay **unrouted** — a wrong category is
   worse than none. Unrouted substances remain findable via search and type
   filters.
3. Route by **evidence-backed or predominant real-world use**, not marketing
   claims. A mushroom sold as "immune support" with its actual literature on
   gut/microbiome effects routes to Digestive Health.
4. Domain follows category automatically (the table above) — never mix, e.g.
   there is no "Body / Cognition".

### 1.2 Type tags (what it IS)

Exactly six canonical tags. Pick **one primary**; add a second only when both
are genuinely true (e.g. ashwagandha = `supplement` + `botanical`).

| Tag | Use for | NOT for |
|---|---|---|
| `supplement` | Vitamins, minerals, amino acids, extracts sold as dietary supplements | Prescription drugs |
| `botanical` | Herbs, roots, mushrooms, plant preparations | Isolated single molecules from plants (those are usually `supplement`) |
| `food-drink` | Whole foods, teas, coffee, functional beverages | Capsuled extracts |
| `pharmaceutical` | Approved prescription/OTC drugs (any country) | Compounds never approved anywhere |
| `peptide` | Peptides and protein fragments (BPC-157, ipamorelin, semaglutide-class) | — |
| `research-compound` | SARMs, unapproved nootropic drugs, gray-market compounds with no approval | Approved drugs used off-label (still `pharmaceutical`) |

### 1.3 Classification (how established)

| Value | Meaning | Rule of thumb |
|---|---|---|
| `Everyday` | Common, widely-used, long safety record | You could buy it in a grocery/health store |
| `Clinical` | Established medical/prescription use | A doctor prescribes it; pharmacopeia-grade evidence |
| `Frontier` | Emerging, experimental, gray-market | Research chemicals, novel peptides, SARMs |
| `Unknown` | Cannot honestly place it | Use sparingly; prefer a real answer |

### 1.4 Bearings (post/discussion topics — NOT substance categories)

Bearings tag **posts** (Dispatches and Signals) in the Square feed, not
substances. They are finer-grained than categories. When research produces
community-facing writeups, suggest bearings from the canonical groups:

- **Cognitive:** Focus, Memory, Brain Fog, Productivity, Motivation, Creativity, Learning, Concentration, Mental Clarity
- **Sleep & Recovery:** Sleep, Deep Sleep, Insomnia, Dreams, Relaxation, Recovery, Soreness, Fatigue
- **Performance:** Strength, Endurance, Energy, Athletic Performance, Muscle Growth, Pump, Training, Cardio, Reaction Time
- **Mood:** Mood, Anxiety, Stress, Calmness, Depression, Irritability, Confidence, Emotional Resilience
- **Hormonal & Sexual:** Libido, Testosterone, Estrogen, Thyroid, Fertility, Sexual Performance
- **Metabolic:** Weight Loss, Fat Loss, Appetite, Satiety, Blood Sugar, Insulin Sensitivity
- **Digestive:** Digestion, Gut Health, Bloating, Nausea, Microbiome
- **Cardiovascular:** Blood Pressure, Cholesterol, Circulation, Heart Rate
- **Pain & Mobility:** Pain, Injury Recovery, Mobility, Tendons, Ligaments, Joint Health
- **Beauty:** Skin Health, Hair Health, Nails, Acne, Looksmaxxing
- **Experience:** First Time Use, Long-Term Use, Dose Change, Interaction, Tolerance, Withdrawal, Dependency
- **Training:** Bodybuilding, Strongman, Powerlifting, Olympic Weightlifting, CrossFit, Running, Cycling, Combat Sports, Climbing, Hypertrophy, Sports Performance
- **Traditional Medicine:** East Asian Medicine, Ayurveda, Native American Medicine, Folk Medicine, Herbal Medicine, Western Herbalism
- **Modern Context:** Biohacking, Longevity, Clinical Use, Sports Nutrition
- **Signal-only:** Beginner Question, Stack Discussion, Protocol Discussion, Brand Experience, Product Quality, Cost / Value, Research, General Discussion

Rule: **bearings come from this list only.** Don't coin new ones in research
output.

### 1.5 Risk level (Low / Moderate / High)

Assigned by substance class, not by vibes. The canonical tiers:

- **Low** — vitamins, minerals, electrolytes, amino acids, common herbs and
  botanicals, probiotics/postbiotics, medicinal mushrooms, everyday food-derived
  compounds.
- **Moderate** — pharmaceuticals used without supervision, stimulant analogs and
  nootropic drugs, sedative/hypnotic drugs, cannabinoids, psychedelics,
  research peptides (non-hormonal), topical prescription actives (retinoids,
  azelaic acid), sunscreen actives, GLP-1-class drugs.
- **High** — anabolic-androgenic steroids and prohormones, SARMs, systemic
  hormones (testosterone, estrogen, thyroid, insulin, hGH, EPO), and anything
  with serious dependence or acute-harm potential.

Tie-breaker: when a substance matches two tiers, take the **higher** one. When
adding a substance similar to an existing one, copy the sibling's tier (e.g. a
new SARM = High because all SARMs are High).

### 1.6 Slugs and aliases (identity)

- `slug` is the natural key: **kebab-case**, singular, no vendor names —
  `magnesium-glycinate`, `lion-s-mane-mushroom`.
- One substance = one slug. Salt forms/esters that the community treats as
  distinct products (testosterone-enanthate vs -propionate) get their own slugs;
  marketing synonyms do not — they become `aliases`.
- Reuse existing slugs on re-import; the importer upserts by slug. Never rename
  a slug in a data pack — that creates a duplicate.

---

## Part 2 — Source categorization (what makes research "not bad")

### 2.1 The 10 source types

Every source gets **exactly one** `source_type`:

| Value | What it is | Typical example |
|---|---|---|
| `human_study` | A single human trial or observational study | An RCT on PubMed |
| `review_or_meta_analysis` | Systematic review / meta-analysis / narrative review | Cochrane review |
| `animal_study` | In-vivo animal research | Rat model study |
| `in_vitro_or_mechanistic` | Cell/tissue work, mechanism papers | Receptor-binding assay |
| `official_label_or_document` | Regulator or official documents | FDA label, EMA report, monograph |
| `brand_or_vendor_document` | Manufacturer-published material | Brand white paper, product page |
| `coa_or_testing_document` | Certificates of analysis, third-party lab tests | COA PDF |
| `practitioner_source` | Clinician-authored guidance | Medical society guideline, textbook chapter |
| `community_or_influencer_mention` | Forum threads, Reddit, podcasts, influencer content | r/Nootropics thread |
| `other` | Genuinely none of the above | Use rarely |

Common mistakes to avoid: a *review* is not a `human_study`; a brand's "clinical
study" page is `brand_or_vendor_document` unless it links the actual paper (then
cite the paper itself); an Examine/database summary page is `practitioner_source`
territory only if clinician-authored — otherwise cite the underlying studies.

### 2.2 The evidence hierarchy (strongest → weakest)

1. Meta-analyses & systematic reviews of human trials
2. Individual human RCTs
3. Human observational/cohort studies
4. Official/regulatory documents
5. Animal studies
6. In-vitro & mechanistic work
7. Practitioner sources
8. Vendor documents & COAs (good for *product* facts, not efficacy)
9. Community/influencer mentions (good for *experience* signal, never efficacy)

Research quality bar — a batch is "good research" when:

- **Top-heavy:** efficacy claims rest on tiers 1–3; animal/in-vitro work is
  labeled as such and never summarized as if it were human evidence.
- **Identified:** every study source carries a **PMID or DOI** (URL as
  fallback), plus year and journal. A source with none of the three is not
  importable evidence.
- **Real:** identifiers are copied from the actual source material, never
  reconstructed from memory. One invented PMID poisons the whole batch.
- **Independent:** efficacy sources are not seller-affiliated. Vendor material
  only ever supports product/brand facts.
- **Current:** prefer the newest meta-analysis over older primaries it
  already covers; don't stack five RCTs that a cited review subsumes.

### 2.3 Findings (the atomic claims)

A finding = one measured result from one source about one substance:

- `endpoint` — what was measured (`sleep quality`, `LDL cholesterol`)
- `direction` — `increased` | `decreased` | `no_clear_change` | `mixed` | `unclear`
- `study_type` — `human_rct`, `human_observational`, `review`, `meta_analysis`,
  `animal`, `in_vitro`, `mechanistic`, `official_document`, `other`
- `finding_summary` — one cautious sentence stating what **this source**
  reported, with population and dose when stated. Banned words: *recommended,
  proven, best, safe, effective, cure*.
- Null results are findings too (`no_clear_change`) — import them; they are what
  keeps the site honest.

---

## Part 3 — Decision flow for any new substance

```
1. Identity     → slug (kebab-case), name, aliases
2. Type tags    → what IS it? (1 primary, max 2)
3. Classification → Everyday / Clinical / Frontier / Unknown
4. Risk level   → tier by class (Part 1.5); ties go higher
5. Categories   → 0–3 honest goal routes (Part 1.1); no forcing
6. Sources      → typed per Part 2.1, identified by PMID/DOI
7. Findings     → one per measured result, cautious language
```

---

## Part 4 — Paste-block for ChatGPT

Copy everything between the lines below into ChatGPT **together with** the
paste-block from `CHATGPT_ZIP_INSTRUCTIONS.md` (which defines the file format),
plus your raw source material.

===== BEGIN TAXONOMY BLOCK =====

You must categorize all output using StackAtlas's fixed taxonomy. Never invent
a category, tag, bearing, or source type that is not listed here.

SUBSTANCE CATEGORIES (routes) — pick 0–3 per substance, only where the use is
honestly central; leave unrouted rather than force a bad fit. Each route is a
{"domain": D, "category": C} pair, exactly as written:

- Mind: Cognition | Recovery | Mood & Stress
- Body: Performance | Pain & Injury | Joint & Mobility | Beauty & Skin
- Vitality: Longevity | Metabolic Health | Hormonal Health | Digestive Health | Heart Health

TYPE TAGS — one primary, max two total, from exactly:
supplement, botanical, food-drink, pharmaceutical, peptide, research-compound

CLASSIFICATION — exactly one of: Everyday (common, long safety record),
Clinical (established medical use), Frontier (experimental/gray-market),
Unknown (last resort).

RISK LEVEL — exactly one of:
- Low: vitamins, minerals, amino acids, common herbs, probiotics, mushrooms
- Moderate: pharmaceuticals, stimulant/nootropic drugs, sedatives, cannabinoids,
  psychedelics, non-hormonal research peptides, topical prescription actives
- High: steroids/prohormones, SARMs, systemic hormones (testosterone, insulin,
  thyroid, hGH, EPO)
When in doubt between two tiers, choose the higher.

SOURCE TYPE — exactly one per source, from:
human_study, review_or_meta_analysis, animal_study, in_vitro_or_mechanistic,
official_label_or_document, brand_or_vendor_document, coa_or_testing_document,
practitioner_source, community_or_influencer_mention, other

RESEARCH QUALITY RULES (hard requirements):
1. Efficacy claims must rest on human evidence (meta-analyses, RCTs,
   observational). Animal and in-vitro sources must be labeled as such and never
   summarized as human results.
2. Every study source needs a PMID or DOI (URL only as fallback), plus year and
   journal — copied from the material I give you, NEVER from memory. If you
   don't have the identifier, say so instead of inventing one.
3. Vendor/brand material may only support product and brand facts, never
   efficacy. Community mentions are experience-signal only.
4. Findings use cautious language; never write "recommended", "proven", "best",
   "safe", or "effective". Include null results as direction
   "no_clear_change".
5. If my source material is weak (all animal, all vendor, no identifiers), tell
   me that plainly in your reply instead of dressing it up.

===== END TAXONOMY BLOCK =====

---

## Appendix — Where each axis lives in the database

| Axis | Tables |
|---|---|
| Categories | `category_routes` (domain, category) + `substance_routes` |
| Type tags | `type_tags` + `substance_type_tags` |
| Classification | `substances.classification` (enum) |
| Risk level | `substances.risk_level` (text: Low/Moderate/High) |
| Bearings | `bearings` + `post_bearings` (posts only) |
| Sources | `research_sources` (`source_type` text, 10 canonical values) |
| Findings | `research_findings` (pending review until approved in Admin) |
| Links | `research_source_substances` / `_brands` / `_stacks` / `_products` |

Canonical category definitions in code: `src/lib/bearings.ts`
(`BEARING_CATEGORIES`); importer format: `docs/data-packs/CHATGPT_ZIP_INSTRUCTIONS.md`.
