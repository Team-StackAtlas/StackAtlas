# Prompt template — Substances

Use this to generate `SubstancePackRow[]` rows with a cheap model (Claude
Haiku, GPT-mini class). Batch size: **20–40 substances per call**. See
[`../README.md`](../README.md) §3–4 for the field contract and why smaller
batches beat one giant call.

Copy everything in the fenced block below, fill in `<<...>>`, and paste it as
the entire prompt.

````
You are generating a StackAtlas Data Pack v1 document containing SUBSTANCE
rows only. Output ONLY a single JSON document — no prose before or after it,
no markdown code fences, no explanation.

The JSON document must have exactly this shape:

{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "<<your model name>>",
  "label": "<<short batch label, e.g. 'Nootropics batch 3'>>",
  "substances": [ ...SubstancePackRow objects... ]
}

Each SubstancePackRow object:

{
  "slug": string,               // REQUIRED, kebab-case, e.g. "n-acetyl-cysteine"
  "name": string,                // REQUIRED
  "classification": string,      // REQUIRED, one of: "Everyday" | "Clinical" | "Frontier" | "Unknown"
  "description": string,         // REQUIRED, 1-3 sentences, neutral/factual tone
  "aliases": string[],           // optional, other common names
  "origin": string,              // optional, where it comes from / how it is derived
  "how_obtained": string,        // optional, how it is typically sourced or manufactured
  "half_life": string,           // optional, free text, e.g. "3-5 hours"; omit if you are not confident
  "reported_dose_range": string, // optional, see LANGUAGE RULES below
  "length_of_cycle": string,     // optional, e.g. "Continuous" or "8-12 weeks"
  "tolerance_buildup": string,   // optional, e.g. "None" | "Slow" | "Fast" | "Unknown"
  "risk_level": string,          // optional, one of: "Low" | "Moderate" | "High"
  "formula": string,             // optional, chemical formula if well established
  "routes": [{ "domain": string, "category": string }],  // optional, e.g. { "domain": "Mind", "category": "Focus" }
  "type_tags": string[],         // optional, free-text labels, e.g. ["Supplement", "Amino Acid"]
  "administration": string[],    // optional, e.g. ["Oral"]
  "markers": string[],           // optional, free-text labels, e.g. ["Clinical Use"]
  "health_risks": string[],      // optional, see LANGUAGE RULES below
  "subjective_effects": string[],// optional, see LANGUAGE RULES below
  "pairings": string[],          // optional, OTHER SUBSTANCE SLUGS this is commonly combined with
  "most_popular_brand_slug": string // optional, omit unless you were given a specific brand slug to use
}

LANGUAGE RULES — apply to every field, especially description, health_risks,
subjective_effects, and reported_dose_range:
- Never write "recommended dosage". Use "reported dose ranges" or "commonly
  discussed dose ranges" instead.
- Never write "best", "proven", "safe", "effective", or "works". Describe
  what is reported or discussed, not what is endorsed.
- Frame health_risks as "reported side effects" / "possible risks", not
  certainties.
- Frame pairings as "possible pairings", not advice or recommendations.
- Do not give medical advice or imply StackAtlas is a dosing authority.
- Only state facts (half_life, formula, origin) you are confident are
  correct. If unsure, omit the field rather than guess.

Return ONLY the JSON document. Do not wrap it in markdown code fences. Do not
add commentary before or after it.

Generate rows for the following substances:
<<list the 20-40 substance names/slugs you want generated, one per line>>
````

## Example output

```json
{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "claude-haiku-4-5",
  "label": "Amino acids batch 1",
  "substances": [
    {
      "slug": "taurine",
      "name": "Taurine",
      "classification": "Everyday",
      "description": "A naturally occurring amino sulfonic acid found in meat, fish, and dairy, and produced endogenously in the body. It is commonly discussed in the context of energy drinks and exercise performance.",
      "origin": "Naturally occurring amino sulfonic acid found in meat, fish, and dairy; also produced endogenously.",
      "reported_dose_range": "Commonly discussed range: 500 mg-2 g daily",
      "length_of_cycle": "Continuous",
      "tolerance_buildup": "None",
      "risk_level": "Low",
      "formula": "C2H7NO3S",
      "routes": [{ "domain": "Body", "category": "Endurance" }],
      "type_tags": ["Supplement", "Amino Acid"],
      "administration": ["Oral"],
      "health_risks": ["Rare reports of gastrointestinal upset"],
      "subjective_effects": ["Reported reduced perceived fatigue during exercise"],
      "pairings": ["l-theanine"]
    }
  ]
}
```
