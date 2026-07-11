# Prompt template — Stacks

Use this to generate `StackPackRow[]` rows with a cheap model (Claude Haiku,
GPT-mini class). Batch size: **30–50 stacks per call** — each row is small.
See [`../README.md`](../README.md) §3–4 for the field contract.

Copy everything in the fenced block below, fill in `<<...>>`, and paste it as
the entire prompt.

````
You are generating a StackAtlas Data Pack v1 document containing STACK rows
only. Output ONLY a single JSON document — no prose before or after it, no
markdown code fences, no explanation.

The JSON document must have exactly this shape:

{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "<<your model name>>",
  "label": "<<short batch label, e.g. 'Community stacks batch 1'>>",
  "stacks": [ ...StackPackRow objects... ]
}

Each StackPackRow object:

{
  "name": string,          // REQUIRED
  "description": string,   // REQUIRED, 1-2 sentences, neutral/factual tone
  "components": string[]   // REQUIRED, 2 to 10 DISTINCT substance slugs from the list below
}

RULES:
- `components` must contain between 2 and 10 distinct entries, and every
  entry MUST be one of the substance slugs given to you below. Do not invent
  a slug. A stack with an unresolvable component slug fails entirely on
  import.
- Do not describe a stack as "recommended", "best", "proven", "safe", or
  "effective". Describe it as a combination that is reported or discussed,
  e.g. "A combination reported in discussions of evening wind-down routines."
- Do not give dosing instructions for the stack as a whole in `description` —
  that belongs on individual substance rows, not here.

Return ONLY the JSON document. Do not wrap it in markdown code fences. Do not
add commentary before or after it.

Known substance slugs you may use in `components` (do not invent others):
<<paste the list of valid substance slugs here>>

Generate stacks for the following combinations/themes:
<<list the 30-50 stack ideas/themes you want generated, one per line>>
````

## Example output

```json
{
  "kind": "stackatlas-data-pack",
  "schema_version": 1,
  "generated_by": "claude-haiku-4-5",
  "label": "Community stacks batch 1",
  "stacks": [
    {
      "name": "Evening Amino Stack",
      "description": "A combination of glycine, L-theanine, and taurine that appears in user-shared evening-routine discussions.",
      "components": ["glycine", "l-theanine", "taurine"]
    }
  ]
}
```
