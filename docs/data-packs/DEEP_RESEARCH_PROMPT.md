# Prompt to send with CLAUDE_DEEP_RESEARCH_INSTRUCTIONS.md

I'm attaching a specification document called **CLAUDE_DEEP_RESEARCH_INSTRUCTIONS.md**. That file is the binding contract for everything you produce in this conversation. This message is your mission briefing — who you're working for, what state the project is in, exactly what I need from you, how to work, and how I will judge the output. Read this entire message AND the entire attached file before you produce a single word of output. Do not skim either one. Do not start researching until you've done the confirmation step at the very bottom of this message.

## Who you are working for and what this is

You are doing contract research for **StackAtlas**, a live community platform for supplements, peptides, and nootropics. Real people browse it to understand what a substance is, what the evidence actually says, what dose ranges have been *reported* (never recommended), what the risks are, and which brands are transparent. The site's entire credibility rests on two things: the taxonomy being clean and the citations being real. You are now part of the supply chain for both, and everything you generate will be imported into a production database through a strict, unforgiving importer. Malformed output doesn't get gracefully fixed — it gets rejected, or worse, it gets imported and quietly poisons the catalog.

You are not writing an article. You are not writing a summary. You are manufacturing structured data with a research dossier to back it. The attached spec defines the exact shape of that data. Treat this the way a database engineer would treat a schema, not the way a writer treats a style guide: there is no creative latitude on field names, enum values, category names, or identifier rules. Zero. Where you DO have latitude — and where I want you to be genuinely excellent — is in the quality of the research itself: finding the strongest, newest human evidence; extracting honest, atomic findings; writing descriptions that are accurate, neutral, and actually informative.

## The current state of the catalog (so you don't duplicate or contradict it)

So you understand what you're adding to: StackAtlas currently has roughly **811 substances**, about **484 research sources**, and a fixed taxonomy of **13 goal categories** in three domains (Mind / Body / Vitality — the full list is in the spec, section 4.1). The 13th category, **Immune Health** (under Vitality), was added recently and is thin — only a handful of substances are routed there so far. The categories were recently consolidated from an older, messier set, which is why the spec contains a legacy-name mapping (Memory, Focus, Sleep, Fat Loss, Gut Health, etc. — those names are DEAD; if you ever emit one, the batch is wrong). Substances follow a strict identity model: kebab-case slugs, synonyms as aliases, and salt forms/esters/vitamers that the community treats as distinct products (magnesium-glycinate vs magnesium-citrate, testosterone-enanthate vs -cypionate, cyanocobalamin vs hydroxocobalamin) are SEPARATE substances with their own slugs — never merged, never invented beyond what's actually sold and discussed.

Assume common substances already exist under their obvious slugs (ashwagandha, caffeine, creatine-monohydrate, melatonin, l-theanine, lions-mane, bpc-157, magnesium-glycinate, and hundreds more). When your research touches a substance that plausibly already exists, use the obvious existing slug and DO NOT redefine it from scratch unless I've asked for profile updates — link sources and findings to it instead. When you genuinely believe a substance is new to the catalog, say so explicitly in your report so I can verify before import.

## Your assignment

[REPLACE THIS BRACKET WITH THE SPECIFIC ASSIGNMENT — e.g. "Deep-research these 10 substances: …" or "Build the immune-health evidence base: andrographis, pelargonium sidoides, bee propolis, bovine colostrum, thymosin alpha-1, LL-37, guduchi" or "Find and structure the strongest human evidence for the 20 most popular sleep/recovery substances". If I forgot to replace this bracket, STOP and ask me what the assignment is before doing anything.]

Unless I say otherwise in the bracket above, the default shape of the assignment is: for each substance in scope, produce (1) a complete, spec-compliant substance entry (or, for existing substances, just the slug reference), (2) the 3–8 strongest sources per substance following the evidence hierarchy in the spec — newest meta-analyses and systematic reviews first, then the most load-bearing RCTs, then official/regulatory documents where relevant — and (3) every honest, atomic finding those sources support, INCLUDING null results. Quality bar: I would rather receive 6 substances with verified identifiers and 40 real findings than 30 substances with thin sourcing. Depth beats width, always. If the assignment is too big to do properly in one run, do the first N substances properly, then tell me where you stopped and why — that is a successful run, not a failed one.

## How to work — the phases, in order

**Phase 0 — Confirmation (before any research).** At the bottom of this message there's a confirmation step. Do it first. It exists because the single most expensive failure mode is a model that produces a beautiful batch against an imagined schema.

**Phase 1 — Plan.** Briefly list the substances in scope, what you already believe about each (so I can catch wrong priors early), and your search strategy per substance. Keep this to a few lines each. Flag any substance where you suspect a slug collision or synonym problem NOW, not after generating.

**Phase 2 — Research (the deep-research pass).** Use browsing/research for real. Go to PubMed, doi.org, journal pages, regulator sites. For every source you decide to keep, you must have actually OPENED its PubMed or journal landing page in this conversation and copied the title, authors, journal, year, and PMID/DOI **verbatim from that page**. This is the ritual, per source, no exceptions: open page → copy identifier exactly → quote the specific result sentence(s) you'll turn into findings → classify source_type honestly. While researching, actively apply the traps list in spec §3: skip SEO blogs and aggregator summaries (chase their citations to the primary paper instead), check for retraction notices, treat preprints as `other` with a note, don't stack RCTs that a meta-analysis you're already citing subsumes, and remember vendor pages can only ever support product facts, community content only experience signal.

**Phase 3 — The dossier (Deliverable A).** Write up what you found BEFORE building files: per substance, the sources kept (with identifiers and the quoted result sentences), the sources you rejected and why, and an honest one-paragraph assessment of the evidence quality (e.g. "all human evidence is small-N and >10 years old" or "one strong 2024 meta-analysis dominates; primaries subsumed"). This dossier is what lets me trust the files without re-doing your research.

**Phase 4 — The files (Deliverable B).** Convert the dossier — and ONLY the dossier — into import files per spec §5. Every finding row must trace to a quoted sentence in Phase 3. Every substance gets classification, risk_level, type_tags, and 0–3 honest category routes from the 13 canonical categories. Descriptions are 1–3 sentences of real, neutral prose. If you can build actual files/zip in this chat, do that; otherwise emit each file complete in its own labeled code block — never truncated, never "…rest omitted".

**Phase 5 — Self-audit.** Run the full checklist in spec §7 line by line and SHOW ME the checklist with each box checked or honestly unchecked. An unchecked box with an explanation is acceptable; a silently false checkmark is the worst thing you can do in this entire engagement.

**Phase 6 — Final report.** Exactly the four-part format in spec §8: files, batch manifest (counts), uncertainty report (what you excluded, what you left empty, what needs human eyes), and coverage gaps (what the next run should do).

## Behavior rules that I want to over-emphasize, because each one has been broken before

1. **Identifiers are sacred.** If you did not open the page, you do not have the identifier. "I'm confident this PMID is right" is not a category that exists — there is only "copied from an opened page" and "left empty." One invented PMID and I have to distrust every row in the batch. If a paper is paywalled, the PubMed abstract page is sufficient to source findings that the abstract itself states — but only those.
2. **No memory-findings.** Your training knowledge is allowed EXACTLY ONE job: writing substance descriptions and informing search strategy. It is never allowed to produce a finding, a citation, a year, a journal name, or a dose figure. Those come from opened pages only.
3. **The taxonomy is closed.** 13 categories, 6 type tags, 4 classifications, 3 risk levels, 10 source types, 5 directions, 9 study types, 6 dose units. If you feel the urge to add a value "just this once" — that urge is the failure mode. Put the nuance in `notes` or `limitations` instead.
4. **Cautious language is not optional flavor.** The words *recommended, proven, best, safe, effective, cure* must appear NOWHERE in generated fields. Also avoid marketing verbs — supports, boosts, optimizes, enhances. Findings say what one source reported in one population at one dose. Descriptions describe; they do not advocate. If a substance is genuinely risky, the risk_level and health_risks fields say so plainly — cautious language means no hype, not no honesty.
5. **Atomic findings.** One endpoint, one direction, one source, one row. A trial that measured sleep quality AND anxiety produces two rows. A review covering four endpoints can produce four rows. Never compress.
6. **Nulls and negatives are first-class.** A well-run trial that found nothing is exactly as importable as one that found an effect, and frankly more valuable to the site's credibility. Do not filter them out to make a substance "look good." StackAtlas is not selling anything.
7. **Honest routing.** Route by what people actually take the thing for and what evidence supports — 0 to 3 categories, never forced. Gray-market and psychoactive substances route by honest predominant use like everything else. If nothing fits, unrouted is correct and you say so.
8. **When you're unsure, the move is always the same:** omit the datum, and write one line about it in the uncertainty report. Never guess, never silently drop. The uncertainty report is not an appendix — I read it first.
9. **The `limitations` field shows publicly on the site next to each finding, so it is either concrete or absent.** Real sample size with the number (n=46), the actual population, a form/route mismatch, industry funding, or a limitation the authors themselves wrote — those belong. "Small sample size," "more research is needed," "results may vary" are banned boilerplate; if that's all you'd write, leave the field out entirely.

## What good looks like vs what bad looks like

A BAD description: "Vitamin A ester. Retinol fatty-acid ester. Catalog domain: Nutrient." (taxonomy metadata pretending to be prose — this exact failure is in the database right now from a previous batch, and it's ugly).
A GOOD description: "A pre-formed vitamin A ester used in dietary supplements and fortified foods. It is converted to retinol in the body; intake from combined sources is relevant because vitamin A accumulates and high chronic intake has reported toxicity."

A BAD finding_summary: "Ashwagandha is proven to effectively reduce stress and is safe for daily use." (three banned words, no source anchoring, no population, no dose).
A GOOD finding_summary: "In this 8-week double-blind RCT in adults reporting chronic stress, 300 mg twice daily of a root extract was associated with reduced perceived-stress scores compared with placebo."

A BAD source decision: citing a Healthline article about magnesium and sleep.
A GOOD source decision: opening the meta-analysis that the Healthline article itself cites, verifying its DOI on the journal page, and citing that — with the Healthline article appearing nowhere.

A BAD batch: 40 substances, each with one vendor page and a paragraph of prose claims.
A GOOD batch: 8 substances, 35 verified sources, 60 atomic findings including 9 null results, a dossier with quoted sentences, and an uncertainty report that says "I could not verify a PMID for the 2019 zinc trial, so it is excluded; colostrum evidence is largely >15 years old; thymosin alpha-1 human data is IV/injectable clinical context, flagged for review."

## Scope control and stamina

Deep research runs can be long. If you hit limits — context, time, tool budget — the priority order is: finish the current substance completely (dossier + files + audit for what's done) rather than leaving everything half-done. Then report exactly where the cut happened. A clean partial batch imports fine; a complete-looking batch with degraded rigor in the back half is poison, because I won't know where the rigor stopped. Never let output quality silently degrade to hit a count. Never pad. If browsing fails or a page won't load, note it and move on — do not substitute memory for the page that didn't load.

## Confirmation step — do this first, before any research

Reply first with, in your own words, no copy-paste: (1) the two deliverables and their order; (2) the three rules you are most at risk of breaking in a long research run and what you'll do to not break them; (3) the exact 13 category names and 10 source_type values, listed from the spec, so I can see you actually read it; (4) any questions about the assignment bracket above — if it's ambiguous, ask now, because mid-run you're expected to note ambiguities and keep moving rather than stall. Keep this confirmation under 300 words, then WAIT for my go-ahead before starting Phase 1.
