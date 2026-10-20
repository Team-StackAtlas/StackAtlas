-- Glossary v2 data pass (generated from the live table on 2026-10-20; see docs/audits/2026-10-20-glossary-audit.md for every call and its reason).
-- Idempotent: deletes by slug, updates by slug.

delete from glossary_terms where slug in ('abstract',
  'animal-study',
  'batch',
  'blend',
  'blood-glucose',
  'blood-pressure',
  'boron',
  'bulk-cut',
  'calcium',
  'capsule',
  'carrier-oil',
  'chloride',
  'chromium',
  'citrate',
  'copper',
  'cream',
  'cycling',
  'daily-intake',
  'data-set',
  'dosage',
  'duration',
  'elimination-half-life',
  'endpoint',
  'expiration-date',
  'frequency',
  'full-text',
  'gel',
  'glycinate',
  'gram-g',
  'gummy',
  'heart-rate',
  'human-study',
  'hydration',
  'hydrochloride',
  'inhaled',
  'injection',
  'iodine',
  'iron',
  'journal',
  'lab-testing',
  'label-claim',
  'label-transparency',
  'liquid-extract',
  'lot-number',
  'lozenge',
  'magnesium',
  'manganese',
  'microbiome',
  'milligram-mg',
  'milliliter-ml',
  'molybdenum',
  'monohydrate',
  'oral',
  'outcome',
  'patch',
  'phosphorus',
  'potassium',
  'powder',
  'probiotic-strain-specificity',
  'sarm-selective-androgen-receptor-modulator',
  'selenium',
  'serving-size',
  'single-dose',
  'sodium',
  'solubility',
  'spray',
  'stacking',
  'storage-conditions',
  'study',
  'supplement',
  'tablet',
  'topical',
  'vitamin-a',
  'vitamin-b1-thiamine',
  'vitamin-b12',
  'vitamin-b2-riboflavin',
  'vitamin-b3-niacin',
  'vitamin-b5-pantothenic-acid',
  'vitamin-b6',
  'vitamin-b7-biotin',
  'vitamin-b9-folate',
  'vitamin-c',
  'vitamin-d',
  'vitamin-e',
  'vitamin-k',
  'with-food',
  'zinc');

update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'absorption';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'accumulation';
update glossary_terms set tags = '{}'::text[], bearings = array['Memory','Focus','Nootropics']::text[], updated_at = now() where slug = 'acetylcholine';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'active-metabolite';
update glossary_terms set tags = '{}'::text[], bearings = array['Stress','Mood','Energy']::text[], updated_at = now() where slug = 'adaptogen';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'adulteration';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'adverse-effect';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Recovery']::text[], updated_at = now() where slug = 'amino-acid';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Strength','Hormones','Testosterone']::text[], updated_at = now() where slug = 'anabolic-steroid';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones','Testosterone']::text[], updated_at = now() where slug = 'androgen';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'antioxidant';
update glossary_terms set tags = array['safety']::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'bacteriostatic-water';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'batch-testing';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'batch-to-batch-consistency';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'bioavailability';
update glossary_terms set category = 'Usage Patterns', tags = array['slang']::text[], bearings = array['Hormones','Testosterone','Muscle Gain']::text[], updated_at = now() where slug = 'blast-and-cruise';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'botanical';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Recovery']::text[], updated_at = now() where slug = 'branched-chain-amino-acid-bcaa';
update glossary_terms set tags = array['slang']::text[], bearings = array['Muscle Gain']::text[], updated_at = now() where slug = 'bulk';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'coa-certificate-of-analysis';
update glossary_terms set tags = '{}'::text[], bearings = array['Sleep','Anxiety','Mood','Recovery']::text[], updated_at = now() where slug = 'cannabinoid';
update glossary_terms set tags = '{}'::text[], bearings = array['Energy','Endurance']::text[], updated_at = now() where slug = 'carbohydrate';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'chelate';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'chelated-mineral';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'cholesterol';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'concentrate';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'contaminant';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'contraindication';
update glossary_terms set tags = '{}'::text[], bearings = array['Stress','Sleep','Hormones']::text[], updated_at = now() where slug = 'cortisol';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'counterfeit-product';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'cross-tolerance';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'cubic-centimeter-cc';
update glossary_terms set tags = array['slang']::text[], bearings = array['Fat Loss']::text[], updated_at = now() where slug = 'cut';
update glossary_terms set tags = array['slang']::text[], bearings = array['Hormones','Nootropics']::text[], updated_at = now() where slug = 'cycle';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'deficiency';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'degradation-product';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'dependence';
update glossary_terms set tags = '{}'::text[], bearings = array['Focus','Mood','Energy']::text[], updated_at = now() where slug = 'dopamine';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'dose';
update glossary_terms set tags = '{}'::text[], bearings = array['Endurance','Recovery']::text[], updated_at = now() where slug = 'electrolyte';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'elemental-amount';
update glossary_terms set tags = '{}'::text[], bearings = array['Fasting']::text[], updated_at = now() where slug = 'empty-stomach';
update glossary_terms set tags = '{}'::text[], bearings = array['Sleep','Anxiety','Mood','Recovery']::text[], updated_at = now() where slug = 'endocannabinoid';
update glossary_terms set tags = array['lab-report','safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'endotoxin';
update glossary_terms set category = 'Classification', tags = array['slang']::text[], bearings = array['Hormones','Muscle Gain']::text[], updated_at = now() where slug = 'enhanced';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'enteric-coated';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Recovery']::text[], updated_at = now() where slug = 'essential-amino-acid';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'ester';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones']::text[], updated_at = now() where slug = 'estrogen';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'extract-ratio';
update glossary_terms set tags = '{}'::text[], bearings = array['Fasting']::text[], updated_at = now() where slug = 'fasted';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'fat';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'fat-soluble-vitamin';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'fatty-acid';
update glossary_terms set tags = '{}'::text[], bearings = array['Gut Health']::text[], updated_at = now() where slug = 'fiber';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'first-pass-metabolism';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'flavonoid';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'fortified';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'free-radical';
update glossary_terms set tags = '{}'::text[], bearings = array['Sleep','Anxiety','Stress']::text[], updated_at = now() where slug = 'gaba';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'gmp-good-manufacturing-practice';
update glossary_terms set tags = '{}'::text[], bearings = array['Memory','Focus']::text[], updated_at = now() where slug = 'glutamate';
update glossary_terms set category = 'Classification', tags = array['slang']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'grey-market';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones','Recovery','Muscle Gain']::text[], updated_at = now() where slug = 'growth-hormone';
update glossary_terms set tags = '{}'::text[], bearings = array['Gut Health']::text[], updated_at = now() where slug = 'gut-microbiome';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'hdl';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'half-life';
update glossary_terms set tags = array['lab-report','safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'heavy-metals';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'herbal-extract';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones']::text[], updated_at = now() where slug = 'hormone';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'identity-testing';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'independent-laboratory';
update glossary_terms set tags = '{}'::text[], bearings = array['Recovery','Longevity']::text[], updated_at = now() where slug = 'inflammation';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'insufficiency';
update glossary_terms set tags = '{}'::text[], bearings = array['Fat Loss','Longevity','Fasting']::text[], updated_at = now() where slug = 'insulin';
update glossary_terms set tags = '{}'::text[], bearings = array['Fat Loss','Longevity','Fasting']::text[], updated_at = now() where slug = 'insulin-sensitivity';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'interaction';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'intramuscular';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'isolate';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'ldl';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'liposomal';
update glossary_terms set tags = '{}'::text[], bearings = array['Strength','Muscle Gain']::text[], updated_at = now() where slug = 'loading-phase';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'lyophilized';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'macronutrient';
update glossary_terms set tags = '{}'::text[], bearings = array['Strength','Muscle Gain']::text[], updated_at = now() where slug = 'maintenance-phase';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'measured-potency';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'microbial-testing';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Mood','Focus']::text[], updated_at = now() where slug = 'microdosing';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'micronized';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'micronutrient';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'mineral';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'mislabeling';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'mushroom-extract';
update glossary_terms set category = 'Classification', tags = array['slang']::text[], bearings = array['Hormones','Muscle Gain']::text[], updated_at = now() where slug = 'natty';
update glossary_terms set tags = '{}'::text[], bearings = array['Mood','Focus','Nootropics']::text[], updated_at = now() where slug = 'neurotransmitter';
update glossary_terms set tags = '{}'::text[], bearings = array['Nootropics','Focus','Memory']::text[], updated_at = now() where slug = 'nootropic';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking']::text[], updated_at = now() where slug = 'novel-compound';
update glossary_terms set tags = '{}'::text[], bearings = array['Mood','Longevity']::text[], updated_at = now() where slug = 'omega-3-fatty-acid';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'omega-6-fatty-acid';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'overdosed';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'oxidative-stress';
update glossary_terms set category = 'Usage Patterns', tags = array['slang']::text[], bearings = array['Hormones','Testosterone','Muscle Gain']::text[], updated_at = now() where slug = 'pct-post-cycle-therapy';
update glossary_terms set tags = '{}'::text[], bearings = array['Recovery','Biohacking']::text[], updated_at = now() where slug = 'peptide';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones']::text[], updated_at = now() where slug = 'peptide-hormone';
update glossary_terms set tags = '{}'::text[], bearings = array['Sleep','Anxiety','Mood','Recovery']::text[], updated_at = now() where slug = 'phytocannabinoid';
update glossary_terms set category = 'Usage Patterns', tags = array['slang']::text[], bearings = array['Hormones','Testosterone','Muscle Gain']::text[], updated_at = now() where slug = 'pinning';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'polyphenol';
update glossary_terms set tags = '{}'::text[], bearings = array['Gut Health']::text[], updated_at = now() where slug = 'postbiotic';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'potency-testing';
update glossary_terms set tags = '{}'::text[], bearings = array['Gut Health']::text[], updated_at = now() where slug = 'prebiotic';
update glossary_terms set tags = '{}'::text[], bearings = array['Gut Health']::text[], updated_at = now() where slug = 'probiotic';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'prodrug';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'product-recall';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Hormones','Testosterone']::text[], updated_at = now() where slug = 'prohormone';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'proprietary-blend';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Recovery']::text[], updated_at = now() where slug = 'protein';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Supplements']::text[], updated_at = now() where slug = 'protocol';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'purity';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'quality-assurance';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'quality-control';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'rda';
update glossary_terms set tags = '{}'::text[], bearings = array['Nootropics','Focus','Memory']::text[], updated_at = now() where slug = 'racetam';
update glossary_terms set category = 'Usage Patterns', tags = array['slang']::text[], bearings = array['Muscle Gain','Fat Loss']::text[], updated_at = now() where slug = 'recomp-body-recomposition';
update glossary_terms set tags = array['safety']::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'reconstitution';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking']::text[], updated_at = now() where slug = 'research-chemical';
update glossary_terms set tags = '{}'::text[], bearings = array['Muscle Gain','Hormones','Testosterone']::text[], updated_at = now() where slug = 'sarm';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'salt-form';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones']::text[], updated_at = now() where slug = 'secretagogue';
update glossary_terms set tags = '{}'::text[], bearings = array['Mood','Sleep','Anxiety']::text[], updated_at = now() where slug = 'serotonin';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'side-effect';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'single-ingredient-product';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'specification';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'spiked-product';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'split-dose';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'stability-testing';
update glossary_terms set tags = array['slang']::text[], bearings = array['Nootropics','Supplements','Biohacking']::text[], updated_at = now() where slug = 'stack';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'standardized-extract';
update glossary_terms set tags = array['lab-report','safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'sterility-testing';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones']::text[], updated_at = now() where slug = 'steroid';
update glossary_terms set tags = '{}'::text[], bearings = array['Biohacking','Hormones']::text[], updated_at = now() where slug = 'subcutaneous';
update glossary_terms set tags = '{}'::text[], bearings = array['Hormones','Testosterone']::text[], updated_at = now() where slug = 'testosterone';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'therapeutic-window';
update glossary_terms set tags = array['lab-report']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'third-party-testing';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'tincture';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'titration';
update glossary_terms set tags = array['slang']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'tolerance-break';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'trace-mineral';
update glossary_terms set tags = array['lab-report']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'traceability';
update glossary_terms set tags = '{}'::text[], bearings = array['Longevity']::text[], updated_at = now() where slug = 'triglyceride';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'underdosed';
update glossary_terms set tags = array['safety']::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'upper-limit-ul';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'vitamin';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'water-soluble-vitamin';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'whole-food-source';
update glossary_terms set tags = array['safety']::text[], bearings = '{}'::text[], updated_at = now() where slug = 'withdrawal';
update glossary_terms set tags = '{}'::text[], bearings = array['Supplements']::text[], updated_at = now() where slug = 'cgmp';
