# Catalog categorisation audit — 2026-10-20

Pulled from the live `substances` table: **805 substances**. This is the honest state of the tagging before any cleanup, so the owner can judge the work instead of taking my word for it.

## Headline numbers

- Routed to at least one category: 735 / 805. **70 have no category route at all** (list below).
- Substances with verified findings but no route: 4 (bpc-157, caffeine, clenbuterol, lions-mane). Fixed in migration `20261020180000`.
- Distinct "type tag" labels: **944** across 805 rows. That is not a vocabulary, it is free text. 50 are snake_case (`wada_prohibited`, `gray_market_alias`), 244 are lowercase phrases (`sleep`, `mood`, `cognition`) that duplicate bearings, and the rest are ad-hoc chemistry descriptors (`Oxygenated DHEA metabolite`, `Brazilian bark blend`). Only 6 labels are used 20+ times.
- Effects filled in: 52 / 805. **753 substances have zero effects**, so Advanced Search's risk/effect filters have nothing to grip for most of the catalog.
- Markers (traditional-use context): 5 / 805 filled.

## Verdict

Routes (the 13 categories) are in reasonable shape: 91% routed, no over-tagging (nothing carries 5+). Type tags are the mess. They were written per-import with no controlled list, so the same idea appears as `Stimulant`, `Stimulant/drug`, `Stimulant seed`, `Stimulant leaf`, `Stimulant-adjacent fruit extract`, `Stimulant/metabolic drug` and `Piperidine stimulant`.

## Proposed fix (next job, needs sign-off)

1. Replace free-text type tags with a **controlled list of ~24**: Vitamin, Mineral, Amino acid, Protein, Fatty acid, Fiber / prebiotic, Probiotic, Botanical, Mushroom, Nootropic, Stimulant, Adaptogen, Peptide, Hormone, Anabolic steroid, SARM, Prohormone, Pharmaceutical, Research compound, Cannabinoid, Psychedelic, Enzyme, Topical / cosmetic, Electrolyte. Everything else becomes either a bearing (if it is a goal) or a plain-text `chemistry_class` field (if it is a chemistry descriptor).
2. Map all existing labels to that list with a reviewable table (label → new tag), the same way the glossary audit lists every call.
3. Enforce it: a `type_tags` check so imports cannot invent new labels, and a CI check on data packs.
4. Effects: backfill from verified findings (a finding with direction `decreased` on `anxiety` implies an effect) rather than hand-writing 750 rows.

## Substances with no category route

7-hydroxymitragynine, artemisia-annua, artemisinin, ayahuasca, bpc-157, caffeine, cat-s-claw, catuaba, cerebrolysin, chloride, clenbuterol, cyanocobalamin, dextromethorphan, ferrous-sulfate, flualprazolam, folic-acid, folinic-acid, he-shou-wu, heme-iron-polypeptide, hydroxocobalamin, ibogaine, ibotenic-acid, kratom, l-5-methyltetrahydrofolate, l-alanine, l-asparagine, l-aspartic-acid, l-citrulline, l-cysteine, l-glutamic-acid, l-histidine, l-methionine, l-ornithine, l-phenylalanine, l-proline, l-serine, l-threonine, lions-mane, lysergic-acid-diethylamide, magnesium-citrate, magnesium-malate, magnesium-oxide, mescaline, mitragynine, modafinil, molybdenum, n-n-dimethyltryptamine, neem, nicotinamide, pantothenic-acid, phenazepam, phosphorus, potassium-chloride, potassium-citrate, potassium-iodide, pyridoxamine, pyridoxine, salvinorin-a, sodium, sodium-ascorbate, sodium-bicarbonate, sodium-chloride, stinging-nettle, testosterone-cypionate, thiamin, thiamine-hydrochloride, thyme, varenicline, vasoactive-intestinal-peptide, zinc-picolinate

## Type-tag labels used 3+ times

- 🌿 Botanical: 117
- Nutrient: 68
- Microbiome: 37
- Metabolite: 28
- Botanical compound: 28
- Amino acid: 27
- Anabolic steroid: 21
- Cosmetic active: 20
- 🧬 Peptide: 19
- Lipid: 18
- Fungal: 16
- Enzyme: 16
- Stimulant: 13
- Nootropic: 13
- vitamin: 13
- Topical drug: 12
- Sunscreen active: 12
- Mineral: 12
- SARM: 11
- Amino-acid derivative: 10
- Peptide hormone: 10
- Nonsteroidal androgen receptor modulator: 9
- Peptide drug: 9
- Probiotic species: 9
- Sleep drug: 9
- Androgen: 9
- wada_prohibited: 8
- Metabolic drug: 7
- Stimulant/drug: 7
- Bodybuilding adjunct/drug: 7
- Racetam: 7
- Cognitive/drug: 7
- Wakefulness agent: 6
- Anxiolytic: 6
- cognition: 6
- Water-soluble B vitamins: 6
- Cannabinoid: 6
- Polyphenol: 6
- Proteinogenic; nonessential: 6
- Psychedelic: 6
- Functional mushroom: 5
- Steroid hormone: 5
- Benzodiazepine: 5
- Carotenoid: 5
- Metabolic modulator: 5
- Glycoprotein hormone: 5
- Essential trace minerals: 5
- neurologic function: 5
- Prohormone: 4
- Cosmetic peptide: 4
- Sleep/mood drug: 4
- Functional fiber: 4
- Peptide nutrient: 4
- Leaf extract: 4
- Water-soluble vitamin: 4
- Cardiometabolic drug: 4
- Spore-forming probiotic species: 4
- Seed oil: 4
- gray_market_alias: 4
- Essential minerals: 4
- TCM root: 4
- 17α-alkylated oral AAS: 4
- Alpha-hydroxy acid: 4
- wada_prohibited_s2: 4
- Root extract: 4
- Protein: 4
- Topical active: 4
- UVB filter: 4
- Coenzyme: 4
- Prebiotic fiber: 4
- Growth-hormone secretagogue: 4
- Proteinogenic; essential: 4
- anabolic_androgenic_steroid: 4
- schedule_iii: 4
- Fat-soluble vitamins: 4
- Aliphatic amine: 3
- Alkaloid/gray-market: 3
- Short-chain fatty acid: 3
- Cobalamin vitamer: 3
- Dipeptide: 3
- Digestive carbohydrase: 3
- Cofactor: 3
- Adaptogen/root: 3
- Medicinal mushroom: 3
- exercise performance: 3
- UVA filter: 3
- Topical drug/cosmetic: 3
- Animal-derived natural product: 3
- Non-protein amino acid: 3
- Functional ingredient: 3
- Probiotic species/subspecies: 3
- Berry extract: 3
- Root/rhizome: 3
- Botanical/gray-market: 3
- Botanical lipid: 3
- investigational_compound: 3
- no_approved_human_use: 3
- SGLT2 inhibitor: 3
- Dairy proteins: 3
- food formulation: 3
- Protein ingredient: 3
- sports-nutrition: 3
- dietary-supplement: 3
- Joint-support ingredient: 3
- blood pressure: 3
- GHRH analog: 3
- Selective estrogen receptor modulator: 3
- oxidative stress: 3
- immune research: 3
- Dual orexin receptor antagonist: 3
- Designer oral AAS: 3
- First-generation H1 antagonist: 3
- Long-chain omega-3: 3
- Acetylcholinesterase inhibitor: 3
- GLP-1 receptor agonist: 3
- Hair/hormone drug: 3
- Z-drug/GABA-A modulator: 3
- homocysteine metabolism: 3
- Seed extract: 3
- Peptide/growth factor: 3
- Postbiotic preparation: 3
- Proteinogenic; conditionally essential: 3
- BCAA; essential: 3
- Fungal extract: 3
- Hormone drug: 3
- investigational_drug: 3
- mood: 3
- nutrient status: 3
- Magnesium salt: 3
- Edible/functional mushroom: 3
- Vitamin K vitamer: 3
- approved_medicine: 3
- prescription_only: 3
- Injectable testosterone ester: 3
- immune function: 3
