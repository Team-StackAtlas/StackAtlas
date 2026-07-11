# Prompt template — Brands

Use this to generate `BrandPackRow[]` rows with a cheap model (Claude Haiku,
GPT-mini class). Batch size: **10–20 brands per call** — each brand can carry
several products with ingredient lists, so output length grows quickly. See
[`../README.md`](../README.md) §3–4 for the field contract.

Copy everything in the fenced block below, fill in `<<...>>`, and paste it as
the entire prompt.

````
You are generating a StackAtlas Data Pack v1 document containing BRAND rows
only. Output ONLY a single JSON document — no prose before or after it, no
markdown code fences, no explanation.

The JSON document must have exactly this shape:

{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "<<your model name>>",
  "label": "<<short batch label, e.g. 'Supplement brands batch 1'>>",
  "brands": [ ...BrandPackRow objects... ]
}

Each BrandPackRow object:

{
  "slug": string,                 // REQUIRED, kebab-case, e.g. "thorne"
  "name": string,                  // REQUIRED
  "description": string,           // optional, 1-2 sentences, neutral/factual tone
  "shipping_reliability": number,  // optional, 0-5, one decimal place
  "contamination_reports": number, // optional, integer count; omit if unknown (do NOT guess a number)
  "products": [
    {
      "name": string,                    // REQUIRED per product
      "substance_slug": string,          // optional, the SUBSTANCE SLUG this product is primarily about
      "ingredients": [{ "name": string, "amount": string }],  // optional
      "health_labels": string[]          // optional, free text, e.g. ["Vegan", "Third-Party Tested"]
    }
  ]
}

LANGUAGE RULES:
- Never write "best", "proven", "safe", "effective", or "works" about a
  brand or product. Describe what the brand states or what is reported, not
  what is endorsed.
- Do not invent shipping_reliability, contamination_reports, or a userRating
  number. If you were not given real data for these, omit the field
  entirely rather than guess a plausible-looking number.
- `substance_slug` on a product must be a real substance slug you were given
  in this prompt's substance list, not one you infer.

Return ONLY the JSON document. Do not wrap it in markdown code fences. Do not
add commentary before or after it.

Known substance slugs you may reference in `substance_slug` (do not invent
others):
<<paste the list of valid substance slugs here>>

Generate rows for the following brands:
<<list the 10-20 brand names, with any known product lines, one per line>>
````

## Example output

```json
{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "claude-haiku-4-5",
  "label": "Supplement brands batch 1",
  "brands": [
    {
      "slug": "purity-labs",
      "name": "Purity Labs",
      "description": "A supplement brand focused on single-ingredient amino acid products with published certificates of analysis.",
      "shipping_reliability": 4.6,
      "contamination_reports": 0,
      "products": [
        {
          "name": "Glycine Powder",
          "substance_slug": "glycine",
          "ingredients": [{ "name": "Glycine", "amount": "3 g per serving" }],
          "health_labels": ["Non-GMO", "Third-Party Tested"]
        }
      ]
    }
  ]
}
```
