export type Domain = 'All' | 'Mind' | 'Body' | 'Vitality' | 'The Frontier';

export interface CategoryStructure {
  domain: Domain;
  categories: {
    name: string;
    subcategories?: string[];
  }[];
}

export const DOMAIN_STRUCTURE: CategoryStructure[] = [
  {
    domain: 'All',
    categories: [
      { name: 'All' },
      { name: 'Novel' },
      { name: 'Popular' },
      { name: 'Beginner-Friendly' }
    ]
  },
  {
    domain: 'Mind',
    categories: [
      { name: 'All' },
      { name: 'Focus' },
      { name: 'Memory' },
      { name: 'Mood' },
      { name: 'Sleep' },
      { name: 'Stress' }
    ]
  },
  {
    domain: 'Body',
    categories: [
      { name: 'All' },
      { name: 'Fat Loss' },
      { name: 'Strength & Muscle' },
      { name: 'Endurance' },
      { name: 'Recovery' }
    ]
  },
  {
    domain: 'Vitality',
    categories: [
      { name: 'All' },
      { name: 'Longevity' },
      { name: 'Hormones' },
      { name: 'Gut Health' },
      { name: 'Metabolic Health' },
      { name: 'Sexual Health' }
    ]
  }
];

export type TypeTag = '💊 Supplement' | '🌿 Botanical' | '🍽️ Food / Drink' | '🏥 Pharmaceutical' | '🧬 Peptide' | '🧪 Research Compound';

export const TYPE_TAGS: { label: string; emoji: string; full: TypeTag }[] = [
  { label: 'Supplement', emoji: '💊', full: '💊 Supplement' },
  { label: 'Botanical', emoji: '🌿', full: '🌿 Botanical' },
  { label: 'Food / Drink', emoji: '🍽️', full: '🍽️ Food / Drink' },
  { label: 'Pharmaceutical', emoji: '🏥', full: '🏥 Pharmaceutical' },
  { label: 'Peptide', emoji: '🧬', full: '🧬 Peptide' },
  { label: 'Research Compound', emoji: '🧪', full: '🧪 Research Compound' }
];

// v1 classification model. Describes how established/experimental a substance is.
// No legal/regulatory meaning is implied.
export type Classification = 'Everyday' | 'Clinical' | 'Frontier' | 'Unknown';
export const CLASSIFICATIONS: Classification[] = ['Everyday', 'Clinical', 'Frontier', 'Unknown'];

// Research scope acts as an access ceiling over classifications.
export type ScopeLevel = 'Citizen' | 'Explorer';
export const SCOPE_CLASSIFICATIONS: Record<ScopeLevel, Classification[]> = {
  Citizen: ['Everyday', 'Clinical'],
  Explorer: ['Everyday', 'Clinical', 'Frontier', 'Unknown'],
};

export type AdministrationMethod = '👄 Oral' | '💉 Injectable' | '🧴 Topical' | '👅 Sublingual';

export const BEARINGS = [
  'Sleep', 'Focus', 'Memory', 'Mood', 'Stress', 'Anxiety', 'Energy', 'Recovery',
  'Endurance', 'Strength', 'Fat Loss', 'Muscle Gain', 'Hormones', 'Testosterone',
  'Longevity', 'Gut Health', 'Nootropics', 'Supplements', 'Fasting', 'Biohacking'
];

export const MARKERS = [
  'East Asian Traditional Medicine', 'Western Herbalism', 'Clinical Use',
  'Longevity Protocol', 'Athletic Performance', 'Underground / Experimental',
  'Cognitive Stack Culture', 'Historical Use'
];

export interface User {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  joinDate: string;
  followersCount: number;
  followingCount: number;
  goldCount: number;
  platinumCount: number;
  isVerified?: boolean;
  verificationType?: 'clinical' | 'research' | 'industry';
  website?: string;
}

export interface Substance {
  classification: Classification;
  id: string;
  name: string;
  /** Alternate names (chemical names, abbreviations, traditional names). */
  aliases?: string[];
  paths: { domain: Domain; category: string }[];
  typeTags: TypeTag[];
  administration: AdministrationMethod[];
  description: string;
  averageDosage: string;
  lengthOfCycle: string;
  mostPopularBrandId: string;
  healthRisks: string[];
  subjectiveEffects: string[];
  toleranceBuildup: string;
  possiblePairings: string[];
  riskLevel?: 'Low' | 'Moderate' | 'High';
  markers?: string[];
  clinicalBaseline?: { dosage: string; links: string[] };
  globalAverage?: string;
  peerMatch?: string;
  formula?: string;
  origin?: string;
  howObtained?: string;
  halfLife?: string;
}

/** @deprecated Use `Substance`. Kept for back-compat during the rename. */
export type Supplement = Substance;

export type HealthLabel =
  | 'Paleo'
  | 'Organic'
  | 'Vegan'
  | 'Gluten-Free'
  | 'Non-GMO'
  | 'Third-Party Tested';

export const HEALTH_LABELS: HealthLabel[] = [
  'Paleo',
  'Organic',
  'Vegan',
  'Gluten-Free',
  'Non-GMO',
  'Third-Party Tested',
];

export interface BrandProduct {
  name: string;
  substanceId?: string;
  ingredients?: { name: string; amount?: string; notes?: string }[];
  healthLabels?: HealthLabel[];
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  products?: string[];
  productCatalog?: BrandProduct[];
  markers?: string[];
  shippingReliability: number; // 1-5
  contaminationReports: number;
  thirdPartyTestingLinks: string[];
  userRating: number; // 1-5
  /** Number of seed ratings the average is based on (for the "enough ratings" gate). */
  ratingCount?: number;
  /** Reviewed transparency signals (COA availability, named lab, testing methods, contact, docs). */
  transparency?: Record<string, unknown>;
}

export interface PostComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  replies?: PostComment[];
  likes?: number;
  likedBy?: string[];
  deleted?: boolean;
}

export interface PostDispatchProtocol {
  entries: {
    substanceId?: string;
    substanceName: string;
    dose: string;
    frequency: string;
  }[];
  duration: string;
  clarification?: string;
}

export interface Post {
  id: string;
  type: 'Dispatch' | 'Signal';
  title: string;
  content: string;
  isGold?: boolean;
  structuredContent?: {
    dosages: string;
    frequency?: string;
    effects: string;
    sideEffects: string;
    personalExperience: string;
    goal?: string;
    startDate?: string;
  };
  author: {
    id: string;
    username: string;
    displayName?: string;
    isVerified: boolean;
    verificationType?: string;
    age?: number;
    weight?: string;
    height?: string;
    sex?: string;
  };
  domain: Domain;
  category: string;
  subcategory?: string;
  supplementId?: string;
  brandId?: string;
  stackId?: string;
  helpfulCount: number;
  comments: number;
  createdAt: string;
  logDetails?: {
    duration?: string;
    dosage?: string;
    brandMentioned?: string;
    stackIncluded?: boolean;
    bloodworkIncluded?: boolean;
  };
  qualityScore: number;
  bearings?: string[];
  dispatchProtocol?: PostDispatchProtocol;
  commentItems?: PostComment[];
  /** True when the post was loaded from Supabase rather than seed/localStorage. */
  persisted?: boolean;
}

export interface Stack {
  id: string;
  name: string;
  description: string;
  substances: { id: string; name: string }[];
  creatorId: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  markers?: string[];
}

export const USERS: User[] = [
  {
    id: 'u1',
    username: 'admin',
    displayName: 'Admin User',
    bio: 'Lead researcher and biohacker. Exploring the limits of human performance and longevity. Founder of StackAtlas.',
    joinDate: 'Joined January 2023',
    followersCount: 1205,
    followingCount: 45,
    goldCount: 15,
    platinumCount: 2,
  },
  {
    id: 'u2',
    username: 'biohacker99',
    displayName: 'Alex',
    bio: 'Optimizing for peak performance.',
    joinDate: 'Joined March 2024',
    followersCount: 342,
    followingCount: 120,
    goldCount: 3,
    platinumCount: 0,
  },
  {
    id: 'u3',
    username: 'longevity_seeker',
    bio: 'On a quest for a longer, healthier life.',
    joinDate: 'Joined June 2024',
    followersCount: 89,
    followingCount: 250,
    goldCount: 0,
    platinumCount: 0,
  }
];

export const STACKS: Stack[] = [
  {
    id: 'st1',
    name: 'Beginner Focus Stack',
    description: 'A simple stack for improving focus and reducing jitters.',
    substances: [
      { id: 'caffeine', name: 'Caffeine' },
      { id: 'l-theanine', name: 'L-Theanine' }
    ],
    creatorId: 'u1',
    createdAt: new Date().toISOString(),
    status: 'approved',
    markers: ['Cognitive Stack Culture']
  },
  {
    id: 'st2',
    name: 'Deep Sleep Protocol',
    description: 'A combination aimed at reducing sleep latency and improving deep sleep phases.',
    substances: [
      { id: 'magnesium-glycinate', name: 'Magnesium Glycinate' },
      { id: 'l-theanine', name: 'L-Theanine' },
      { id: 'melatonin', name: 'Melatonin' }
    ],
    creatorId: 'u2',
    createdAt: new Date().toISOString(),
    status: 'approved',
    markers: ['Clinical Use']
  },
  {
    id: 'st3',
    name: 'Endurance & Pump',
    description: 'Pre-workout stack for sustained energy and blood flow.',
    substances: [
      { id: 'l-citrulline', name: 'L-Citrulline' },
      { id: 'caffeine', name: 'Caffeine' }
    ],
    creatorId: 'u3',
    createdAt: new Date().toISOString(),
    status: 'approved',
    markers: ['Athletic Performance']
  }
];

export const BRANDS: Brand[] = [
  {
    id: 'b1',
    name: 'Nootropics Depot',
    description: 'A highly trusted vendor specializing in novel nootropics and standardized extracts.',
    products: ['caffeine', 'l-theanine', 'ashwagandha', 'lions-mane'],
    productCatalog: [
      {
        name: 'L-Theanine 200mg',
        substanceId: 'l-theanine',
        ingredients: [{ name: 'L-Theanine', amount: '200 mg' }],
        healthLabels: ['Vegan', 'Gluten-Free', 'Non-GMO', 'Third-Party Tested'],
      },
      {
        name: 'Caffeine + L-Theanine',
        substanceId: 'caffeine',
        ingredients: [
          { name: 'Caffeine', amount: '100 mg' },
          { name: 'L-Theanine', amount: '200 mg' },
        ],
        healthLabels: ['Vegan', 'Non-GMO'],
      },
    ],
    markers: ['Cognitive Stack Culture'],
    shippingReliability: 4.8,
    contaminationReports: 0,
    thirdPartyTestingLinks: ['https://example.com/test1', 'https://example.com/test2'],
    userRating: 4.9,
    ratingCount: 128,
  },
  {
    id: 'b2',
    name: 'Thorne',
    description: 'Premium supplement brand focused on clinical efficacy and clean ingredients.',
    products: ['magnesium-glycinate', 'creatine-monohydrate', 'melatonin'],
    productCatalog: [
      {
        name: 'Magnesium Bisglycinate',
        substanceId: 'magnesium-glycinate',
        ingredients: [{ name: 'Magnesium (as bisglycinate)', amount: '200 mg' }],
        healthLabels: ['Gluten-Free', 'Non-GMO', 'Third-Party Tested'],
      },
      {
        name: 'Creatine',
        substanceId: 'creatine-monohydrate',
        ingredients: [{ name: 'Creatine Monohydrate', amount: '5 g' }],
        healthLabels: ['Vegan', 'Gluten-Free', 'Non-GMO', 'Third-Party Tested'],
      },
    ],
    markers: ['Clinical Use'],
    shippingReliability: 4.9,
    contaminationReports: 0,
    thirdPartyTestingLinks: ['https://example.com/thorne-test'],
    userRating: 4.8,
    ratingCount: 342,
  },
  {
    id: 'b3',
    name: 'Peptide Sciences',
    description: 'Research chemical supplier providing high-purity peptides for experimental use.',
    products: ['bpc-157', 'semaglutide', 'cerebrolysin'],
    markers: ['Underground / Experimental'],
    shippingReliability: 4.5,
    contaminationReports: 1,
    thirdPartyTestingLinks: ['https://example.com/ps-test'],
    userRating: 4.2,
    ratingCount: 11,
  }
];

export const SUBSTANCES: Substance[] = [
  {
    id: 'magnesium-glycinate',
    name: 'Magnesium Glycinate',
    formula: 'C4H8MgN2O4',
    description: 'A highly bioavailable form of magnesium bound to glycine, known for its calming properties and support for sleep and muscle recovery.',
    paths: [
      { domain: 'Mind', category: 'Sleep' },
      { domain: 'Mind', category: 'Stress' },
      { domain: 'Body', category: 'Recovery' },
      { domain: 'All', category: 'Beginner-Friendly' },
      { domain: 'All', category: 'Popular' }
    ],
    typeTags: ['💊 Supplement'],
    classification: 'Everyday',
    administration: ['👄 Oral'],
    averageDosage: '200-400mg',
    lengthOfCycle: 'Continuous',
    mostPopularBrandId: 'b2',
    healthRisks: ['Mild gastrointestinal discomfort at high doses'],
    subjectiveEffects: ['Relaxation', 'Improved sleep quality', 'Reduced muscle tension'],
    toleranceBuildup: 'None',
    possiblePairings: ['L-Theanine', 'Zinc', 'Vitamin D3'],
    riskLevel: 'Low',
    markers: ['Clinical Use', 'Longevity Protocol']
  },
  {
    id: 'caffeine',
    name: 'Caffeine',
    formula: 'C8H10N4O2',
    description: 'A central nervous system stimulant that reduces fatigue and improves focus and endurance.',
    paths: [
      { domain: 'Mind', category: 'Focus' },
      { domain: 'Body', category: 'Endurance' },
      { domain: 'All', category: 'Popular' },
      { domain: 'All', category: 'Beginner-Friendly' }
    ],
    typeTags: ['🍽️ Food / Drink', '🌿 Botanical'],
    classification: 'Everyday',
    administration: ['👄 Oral'],
    averageDosage: '100-200mg',
    lengthOfCycle: 'Continuous with occasional breaks',
    mostPopularBrandId: 'b1',
    healthRisks: ['Anxiety', 'Insomnia', 'Increased heart rate'],
    subjectiveEffects: ['Alertness', 'Energy', 'Focus'],
    toleranceBuildup: 'Fast',
    possiblePairings: ['L-Theanine', 'Taurine'],
    riskLevel: 'Low',
    markers: ['Athletic Performance', 'Cognitive Stack Culture']
  },
  {
    id: 'creatine-monohydrate',
    name: 'Creatine Monohydrate',
    formula: 'C4H9N3O2',
    description: 'A naturally occurring compound that helps supply energy to cells, primarily muscle, improving strength and cognitive function.',
    paths: [
      { domain: 'Body', category: 'Strength & Muscle' },
      { domain: 'Mind', category: 'Memory' },
      { domain: 'All', category: 'Popular' }
    ],
    typeTags: ['💊 Supplement'],
    classification: 'Everyday',
    administration: ['👄 Oral'],
    averageDosage: '5g daily',
    lengthOfCycle: 'Continuous',
    mostPopularBrandId: 'b2',
    healthRisks: ['Water retention', 'Mild GI distress if not dissolved'],
    subjectiveEffects: ['Increased strength', 'Slight weight gain (water)', 'Mental clarity'],
    toleranceBuildup: 'None',
    possiblePairings: ['Beta-Alanine', 'Whey Protein'],
    riskLevel: 'Low',
    markers: ['Athletic Performance', 'Clinical Use']
  },
  {
    id: 'ashwagandha',
    name: 'Ashwagandha',
    description: 'An adaptogenic herb traditionally used to reduce stress and anxiety, and support hormonal balance.',
    paths: [
      { domain: 'Mind', category: 'Stress' },
      { domain: 'Mind', category: 'Mood' },
      { domain: 'Vitality', category: 'Hormones' },
      { domain: 'All', category: 'Popular' }
    ],
    typeTags: ['🌿 Botanical'],
    classification: 'Everyday',
    administration: ['👄 Oral'],
    averageDosage: '300-600mg (KSM-66)',
    lengthOfCycle: '8-12 weeks',
    mostPopularBrandId: 'b1',
    healthRisks: ['Lethargy', 'Anhedonia with prolonged use'],
    subjectiveEffects: ['Calmness', 'Reduced anxiety', 'Blunted emotions (rare)'],
    toleranceBuildup: 'Slow',
    possiblePairings: ['Rhodiola Rosea', 'L-Theanine'],
    riskLevel: 'Low',
    markers: ['East Asian Traditional Medicine', 'Western Herbalism']
  },
  {
    id: 'melatonin',
    name: 'Melatonin',
    formula: 'C13H16N2O2',
    halfLife: 'Immediate-release melatonin generally has a plasma half-life of roughly 20-50 minutes. Prolonged- or surge-sustained formulations extend exposure for several hours, so release profile is more informative than one pooled value.',
    description: 'A hormone that regulates the sleep-wake cycle, useful for jet lag and sleep onset.',
    paths: [
      { domain: 'Mind', category: 'Sleep' },
      { domain: 'All', category: 'Beginner-Friendly' }
    ],
    typeTags: ['💊 Supplement'],
    classification: 'Everyday',
    administration: ['👄 Oral', '👅 Sublingual'],
    averageDosage: '0.3-3mg',
    lengthOfCycle: 'As needed',
    mostPopularBrandId: 'b2',
    healthRisks: ['Grogginess', 'Vivid dreams'],
    subjectiveEffects: ['Drowsiness', 'Faster sleep onset'],
    toleranceBuildup: 'Minimal',
    possiblePairings: ['Magnesium Glycinate'],
    riskLevel: 'Low',
    markers: ['Clinical Use']
  },
  {
    id: 'modafinil',
    name: 'Modafinil',
    formula: 'C15H15NO2S',
    description: 'A wakefulness-promoting agent used to treat narcolepsy and shift work sleep disorder, often used off-label for cognitive enhancement.',
    paths: [
      { domain: 'Mind', category: 'Focus' }
    ],
    typeTags: ['🏥 Pharmaceutical'],
    classification: 'Clinical',
    administration: ['👄 Oral'],
    averageDosage: '100-200mg',
    lengthOfCycle: '1-3 days per week',
    mostPopularBrandId: 'b1',
    healthRisks: ['Headache', 'Insomnia', 'Anxiety', 'Rare skin reactions'],
    subjectiveEffects: ['Intense focus', 'Wakefulness', 'Reduced fatigue'],
    toleranceBuildup: 'Moderate',
    possiblePairings: ['Caffeine', 'L-Theanine'],
    riskLevel: 'Moderate',
  },
  {
    id: 'testosterone-cypionate',
    name: 'Testosterone Cypionate',
    description: 'An injectable ester of the primary male sex hormone, used in hormone replacement therapy and muscle building.',
    paths: [
      { domain: 'Body', category: 'Strength & Muscle' },
      { domain: 'Vitality', category: 'Hormones' },
      { domain: 'Vitality', category: 'Sexual Health' }
    ],
    typeTags: ['🏥 Pharmaceutical'],
    classification: 'Clinical',
    administration: ['💉 Injectable'],
    averageDosage: '100-200mg/week (TRT)',
    lengthOfCycle: 'Continuous (TRT) or 12-16 weeks',
    mostPopularBrandId: 'b1',
    healthRisks: ['Cardiovascular issues', 'Prostate enlargement', 'HPTA suppression'],
    subjectiveEffects: ['Increased libido', 'Muscle growth', 'Improved mood/energy'],
    toleranceBuildup: 'None',
    possiblePairings: ['HCG', 'Aromatase Inhibitors'],
    riskLevel: 'High',
  },
  {
    id: 'bpc-157',
    name: 'BPC-157',
    description: 'A synthetic peptide sequence derived from a protective protein found in the stomach, known for rapid tissue healing and gut repair.',
    paths: [
      { domain: 'Body', category: 'Recovery' },
      { domain: 'Vitality', category: 'Gut Health' },
      { domain: 'All', category: 'Novel' }
    ],
    typeTags: ['🧬 Peptide', '🧪 Research Compound'],
    classification: 'Frontier',
    administration: ['💉 Injectable', '👄 Oral'],
    averageDosage: '250-500mcg daily',
    lengthOfCycle: '4-6 weeks',
    mostPopularBrandId: 'b1',
    healthRisks: ['Unknown long-term effects', 'Potential angiogenesis'],
    subjectiveEffects: ['Rapid joint/tendon pain relief', 'Improved digestion'],
    toleranceBuildup: 'Unknown',
    possiblePairings: ['TB-500'],
    riskLevel: 'Moderate',
  },
  {
    id: 'semaglutide',
    name: 'Semaglutide',
    description: 'A GLP-1 receptor agonist that increases insulin secretion and decreases glucagon secretion, highly effective for weight loss and metabolic health.',
    paths: [
      { domain: 'Body', category: 'Fat Loss' },
      { domain: 'Vitality', category: 'Metabolic Health' },
      { domain: 'All', category: 'Popular' }
    ],
    typeTags: ['🧬 Peptide', '🏥 Pharmaceutical'],
    classification: 'Clinical',
    administration: ['💉 Injectable', '👅 Sublingual'],
    averageDosage: '0.25-2.4mg weekly',
    lengthOfCycle: 'Continuous',
    mostPopularBrandId: 'b1',
    healthRisks: ['Nausea', 'Vomiting', 'Pancreatitis risk', 'Muscle loss if not training'],
    subjectiveEffects: ['Appetite suppression', 'Early satiety', 'Weight loss'],
    toleranceBuildup: 'Moderate',
    possiblePairings: ['High Protein Diet', 'Resistance Training'],
    riskLevel: 'Moderate',
  },
  {
    id: 'rapamycin',
    name: 'Rapamycin',
    description: 'An mTOR inhibitor originally used as an immunosuppressant, now heavily researched for its potential life-extension and anti-aging properties.',
    paths: [
      { domain: 'Vitality', category: 'Longevity' },
      { domain: 'All', category: 'Novel' }
    ],
    typeTags: ['🏥 Pharmaceutical', '🧪 Research Compound'],
    classification: 'Frontier',
    administration: ['👄 Oral'],
    averageDosage: '2-6mg weekly',
    lengthOfCycle: 'Continuous (pulsed)',
    mostPopularBrandId: 'b1',
    healthRisks: ['Immunosuppression', 'Mouth ulcers', 'Lipid dysregulation'],
    subjectiveEffects: ['Often imperceptible', 'Reduced inflammation'],
    toleranceBuildup: 'Unknown',
    possiblePairings: ['Metformin', 'Acarbose'],
    riskLevel: 'High',
  },
  {
    id: 'l-citrulline',
    name: 'L-Citrulline',
    description: 'An amino acid that increases nitric oxide production, improving blood flow, exercise endurance, and erectile function.',
    paths: [
      { domain: 'Body', category: 'Endurance' },
      { domain: 'Vitality', category: 'Sexual Health' }
    ],
    typeTags: ['💊 Supplement'],
    classification: 'Everyday',
    administration: ['👄 Oral'],
    averageDosage: '3-6g',
    lengthOfCycle: 'Continuous',
    mostPopularBrandId: 'b2',
    healthRisks: ['Mild GI distress'],
    subjectiveEffects: ['Muscle pumps', 'Improved stamina', 'Better blood flow'],
    toleranceBuildup: 'Minimal',
    possiblePairings: ['Malic Acid', 'Arginine'],
    riskLevel: 'Low',
  },
  {
    id: 'l-theanine',
    name: 'L-Theanine',
    formula: 'C7H14N2O3',
    description: 'An amino acid found in tea leaves that promotes relaxation without drowsiness, often paired with caffeine to smooth out jitters.',
    paths: [
      { domain: 'Mind', category: 'Focus' },
      { domain: 'Mind', category: 'Stress' }
    ],
    typeTags: ['💊 Supplement', '🌿 Botanical'],
    classification: 'Everyday',
    administration: ['👄 Oral'],
    averageDosage: '100-200mg',
    lengthOfCycle: 'Continuous',
    mostPopularBrandId: 'b1',
    healthRisks: ['None significant'],
    subjectiveEffects: ['Calm focus', 'Reduced anxiety', 'Relaxation'],
    toleranceBuildup: 'Minimal',
    possiblePairings: ['Caffeine'],
    riskLevel: 'Low',
  },
  {
    id: 'lions-mane',
    name: 'Lions Mane',
    description: 'A medicinal mushroom that stimulates Nerve Growth Factor (NGF), potentially improving memory and cognitive function.',
    paths: [
      { domain: 'Mind', category: 'Memory' },
      { domain: 'All', category: 'Novel' }
    ],
    typeTags: ['🌿 Botanical', '🍽️ Food / Drink'],
    classification: 'Everyday',
    administration: ['👄 Oral'],
    averageDosage: '500-1000mg (extract)',
    lengthOfCycle: 'Continuous',
    mostPopularBrandId: 'b1',
    healthRisks: ['Rare allergic reactions', 'Potential libido reduction (anecdotal)'],
    subjectiveEffects: ['Improved memory recall', 'Vivid dreams', 'Mental clarity'],
    toleranceBuildup: 'Slow',
    possiblePairings: ['Psilocybin (Stamets Stack)', 'Niacin'],
    riskLevel: 'Low',
  },
  {
    id: 'metformin',
    name: 'Metformin',
    description: 'A first-line medication for type 2 diabetes that improves insulin sensitivity, also studied for anti-aging benefits.',
    paths: [
      { domain: 'Vitality', category: 'Metabolic Health' },
      { domain: 'Vitality', category: 'Longevity' }
    ],
    typeTags: ['🏥 Pharmaceutical'],
    classification: 'Clinical',
    administration: ['👄 Oral'],
    averageDosage: '500-1500mg',
    lengthOfCycle: 'Continuous',
    mostPopularBrandId: 'b1',
    healthRisks: ['GI distress', 'Vitamin B12 deficiency', 'Lactic acidosis (rare)'],
    subjectiveEffects: ['Lower blood sugar', 'Potential slight weight loss'],
    toleranceBuildup: 'Minimal',
    possiblePairings: ['Vitamin B12'],
    riskLevel: 'Moderate',
  },
  {
    id: 'clenbuterol',
    name: 'Clenbuterol',
    description: 'A sympathomimetic amine used by sufferers of breathing disorders as a decongestant and bronchodilator, often abused for fat loss.',
    paths: [
      { domain: 'Body', category: 'Fat Loss' }
    ],
    typeTags: ['🏥 Pharmaceutical', '🧪 Research Compound'],
    classification: 'Frontier',
    administration: ['👄 Oral'],
    averageDosage: '20-40mcg',
    lengthOfCycle: '2 weeks on, 2 weeks off',
    mostPopularBrandId: 'b1',
    healthRisks: ['Cardiac hypertrophy', 'Tachycardia', 'Muscle tremors', 'Anxiety'],
    subjectiveEffects: ['Rapid heart rate', 'Increased body temperature', 'Fat loss'],
    toleranceBuildup: 'Fast',
    possiblePairings: ['Ketotifen', 'Taurine'],
    riskLevel: 'High',
  },
  {
    id: 'cerebrolysin',
    name: 'Cerebrolysin',
    description: 'A mixture of peptides purified from pig brains, used to treat stroke and traumatic brain injury, with potent neurotrophic effects.',
    paths: [
      { domain: 'Mind', category: 'Memory' },
      { domain: 'All', category: 'Novel' }
    ],
    typeTags: ['🧬 Peptide', '🏥 Pharmaceutical'],
    classification: 'Frontier',
    administration: ['💉 Injectable'],
    averageDosage: '5-10ml daily',
    lengthOfCycle: '4 weeks',
    mostPopularBrandId: 'b1',
    healthRisks: ['Injection site reactions', 'Brain fog during use'],
    subjectiveEffects: ['Long-term memory improvement', 'Neuro-recovery'],
    toleranceBuildup: 'None',
    possiblePairings: ['Cortexin'],
    riskLevel: 'Moderate',
  }
];

/** @deprecated Use `SUBSTANCES`. Kept for back-compat during the rename. */
export const SUPPLEMENTS = SUBSTANCES;

// ---------------------------------------------------------------------------
// Sources — evidence that attaches to specific catalog claims/sections.
// ---------------------------------------------------------------------------
export type SourceType = 'study' | 'article' | 'official' | 'label' | 'database' | 'other';
export type SourceSection =
  | 'summary'
  | 'dosage'
  | 'side_effects'
  | 'brand_claim'
  | 'ingredient'
  | 'testing'
  | 'stack_description';
export type SourceTargetType = 'substance' | 'brand' | 'stack';

export interface Source {
  id: string;
  targetType: SourceTargetType;
  targetId: string;
  section: SourceSection;
  title: string;
  url: string;
  sourceType: SourceType;
  publisher?: string;
  accessedAt?: string;
}

export const SOURCES: Source[] = [
  {
    id: 'src-mag-dosage',
    targetType: 'substance',
    targetId: 'magnesium-glycinate',
    section: 'dosage',
    title: 'Magnesium supplementation: dosing and bioavailability',
    url: 'https://pubmed.ncbi.nlm.nih.gov/29387426/',
    sourceType: 'study',
    publisher: 'PubMed',
    accessedAt: '2026-05-01',
  },
  {
    id: 'src-mag-side',
    targetType: 'substance',
    targetId: 'magnesium-glycinate',
    section: 'side_effects',
    title: 'Magnesium: tolerability and gastrointestinal effects',
    url: 'https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/',
    sourceType: 'official',
    publisher: 'NIH Office of Dietary Supplements',
    accessedAt: '2026-05-01',
  },
  {
    id: 'src-caffeine-dosage',
    targetType: 'substance',
    targetId: 'caffeine',
    section: 'dosage',
    title: 'Caffeine intake and performance: dose considerations',
    url: 'https://pubmed.ncbi.nlm.nih.gov/33388079/',
    sourceType: 'study',
    publisher: 'PubMed',
    accessedAt: '2026-05-01',
  },
  {
    id: 'src-thorne-testing',
    targetType: 'brand',
    targetId: 'b2',
    section: 'testing',
    title: 'Third-party testing & certificate of analysis',
    url: 'https://www.thorne.com/quality',
    sourceType: 'official',
    publisher: 'Thorne',
    accessedAt: '2026-05-01',
  },
  {
    id: 'src-st2-desc',
    targetType: 'stack',
    targetId: 'st2',
    section: 'stack_description',
    title: 'Sleep architecture and combined magnesium/glycine/melatonin use',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28503116/',
    sourceType: 'study',
    publisher: 'PubMed',
    accessedAt: '2026-05-01',
  },
];

export const getSources = (
  targetType: SourceTargetType,
  targetId: string,
  section?: SourceSection,
): Source[] =>
  SOURCES.filter(
    (s) =>
      s.targetType === targetType &&
      s.targetId === targetId &&
      (section ? s.section === section : true),
  );

import { SEED_POSTS } from './seedPosts';

const MOCK_COMMENT_COPY = [
  'This matched my experience too. The timing details are especially useful.',
  'Appreciate the specific context here; it makes the protocol easier to compare.',
  'Useful writeup. I would be interested to hear whether this changed after a few more weeks.',
  'Good signal for others tracking the same outcome.',
];

const withDemoComments = (post: Post, index: number): Post => {
  if (post.commentItems && post.commentItems.length > 0) return post;
  const count = Math.min(Math.max(post.comments, 1), 2);
  return {
    ...post,
    commentItems: Array.from({ length: count }, (_, commentIndex) => ({
      id: `${post.id}_comment_${commentIndex + 1}`,
      author: commentIndex === 0 ? 'atlas_member' : 'protocol_notes',
      content: MOCK_COMMENT_COPY[(index + commentIndex) % MOCK_COMMENT_COPY.length],
      createdAt: new Date(Date.now() - (index + commentIndex + 1) * 60 * 60 * 1000).toISOString(),
      likes: commentIndex,
      likedBy: [],
      replies: commentIndex === 0 ? [{
        id: `${post.id}_comment_${commentIndex + 1}_reply_1`,
        author: 'stack_reply',
        content: 'Adding a nested reply so the thread count and layout stay representative.',
        createdAt: new Date(Date.now() - (index + commentIndex + 1) * 45 * 60 * 1000).toISOString(),
        likes: 0,
        likedBy: [],
      }] : [],
    })),
  };
};

export const getPosts = (): Post[] => {
  const stored = localStorage.getItem('stackatlas_posts');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return [...parsed, ...SEED_POSTS.map(withDemoComments)];
      }
    } catch (e) {
      console.error('Failed to parse stored posts', e);
    }
  }
  return SEED_POSTS.map(withDemoComments);
};

export let POSTS: Post[] = getPosts();

export const addPost = (post: Post) => {
  const stored = localStorage.getItem('stackatlas_posts');
  let current: Post[] = [];
  if (stored) {
    try {
      current = JSON.parse(stored);
    } catch {
      current = [];
    }
  }
  current.unshift(post);
  localStorage.setItem('stackatlas_posts', JSON.stringify(current));
  POSTS = getPosts();
};
