import { STACKS, SUPPLEMENTS } from './mockData';

export const COMMUNITY_CATEGORIES = [
  'Cognition',
  'Recovery',
  'Performance',
  'Longevity',
  'Mood & Stress',
  'Metabolic Health',
  'Hormonal Health',
  'Digestive Health',
  'Heart Health',
  'Immune Health',
  'Pain & Injury',
  'Joint & Mobility',
  'Beauty & Skin',
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export const CATEGORY_META: Record<CommunityCategory, { iconUrl: string | null; imageUrl: string | null }> =
  Object.fromEntries(COMMUNITY_CATEGORIES.map((category) => [category, { iconUrl: null, imageUrl: null }])) as Record<
    CommunityCategory,
    { iconUrl: string | null; imageUrl: string | null }
  >;

export const BEARING_GROUPS = {
  Cognitive: ['Focus', 'Memory', 'Brain Fog', 'Productivity', 'Motivation', 'Creativity', 'Learning', 'Concentration', 'Mental Clarity'],
  'Sleep & Recovery': ['Sleep', 'Deep Sleep', 'Insomnia', 'Dreams', 'Relaxation', 'Recovery', 'Soreness', 'Fatigue'],
  Performance: ['Strength', 'Endurance', 'Energy', 'Athletic Performance', 'Muscle Growth', 'Pump', 'Training', 'Cardio', 'Reaction Time'],
  Mood: ['Mood', 'Anxiety', 'Stress', 'Calmness', 'Depression', 'Irritability', 'Confidence', 'Emotional Resilience'],
  'Hormonal & Sexual': ['Libido', 'Testosterone', 'Estrogen', 'Thyroid', 'Fertility', 'Sexual Performance'],
  Metabolic: ['Weight Loss', 'Fat Loss', 'Appetite', 'Satiety', 'Blood Sugar', 'Insulin Sensitivity'],
  Digestive: ['Digestion', 'Gut Health', 'Bloating', 'Nausea', 'Microbiome'],
  Cardiovascular: ['Blood Pressure', 'Cholesterol', 'Circulation', 'Heart Rate'],
  'Pain & Mobility': ['Pain', 'Injury Recovery', 'Mobility', 'Tendons', 'Ligaments', 'Joint Health'],
  Beauty: ['Skin Health', 'Hair Health', 'Nails', 'Acne', 'Looksmaxxing'],
  Experience: ['First Time Use', 'Long-Term Use', 'Dose Change', 'Interaction', 'Tolerance', 'Withdrawal', 'Dependency'],
  Training: ['Bodybuilding', 'Strongman', 'Powerlifting', 'Olympic Weightlifting', 'CrossFit', 'Running', 'Cycling', 'Combat Sports', 'Climbing', 'Hypertrophy', 'Sports Performance'],
  'Traditional Medicine': ['East Asian Medicine', 'Ayurveda', 'Native American Medicine', 'Folk Medicine', 'Herbal Medicine', 'Western Herbalism'],
  'Modern Context': ['Biohacking', 'Longevity', 'Clinical Use', 'Sports Nutrition'],
  'Signal-only Discussion': ['Beginner Question', 'Stack Discussion', 'Protocol Discussion', 'Brand Experience', 'Product Quality', 'Cost / Value', 'Research', 'General Discussion'],
} as const;

export const DISPATCH_BEARINGS = Object.entries(BEARING_GROUPS)
  .filter(([group]) => group !== 'Signal-only Discussion')
  .flatMap(([, bearings]) => [...bearings]);

export const SIGNAL_BEARINGS = Object.values(BEARING_GROUPS).flatMap((bearings) => [...bearings]);

export const CATEGORY_BEARING_SUGGESTIONS: Record<CommunityCategory, string[]> = {
  Cognition: ['Focus', 'Memory', 'Brain Fog', 'Productivity', 'Motivation', 'Mental Clarity'],
  Recovery: ['Sleep', 'Deep Sleep', 'Relaxation', 'Recovery', 'Soreness', 'Fatigue'],
  Performance: ['Strength', 'Endurance', 'Energy', 'Athletic Performance', 'Muscle Growth', 'Pump', 'Training'],
  Longevity: ['Longevity', 'Biohacking', 'Clinical Use', 'Long-Term Use'],
  'Mood & Stress': ['Mood', 'Anxiety', 'Stress', 'Calmness', 'Depression', 'Emotional Resilience'],
  'Metabolic Health': ['Weight Loss', 'Fat Loss', 'Appetite', 'Satiety', 'Blood Sugar', 'Insulin Sensitivity'],
  'Hormonal Health': ['Libido', 'Testosterone', 'Estrogen', 'Thyroid', 'Fertility'],
  'Digestive Health': ['Digestion', 'Gut Health', 'Bloating', 'Nausea', 'Microbiome'],
  'Heart Health': ['Blood Pressure', 'Cholesterol', 'Circulation', 'Heart Rate'],
  'Immune Health': ['Recovery', 'Fatigue', 'Clinical Use'],
  'Pain & Injury': ['Pain', 'Injury Recovery', 'Recovery', 'Soreness'],
  'Joint & Mobility': ['Mobility', 'Tendons', 'Ligaments', 'Joint Health', 'Injury Recovery'],
  'Beauty & Skin': ['Skin Health', 'Hair Health', 'Nails', 'Acne', 'Looksmaxxing'],
};

const keywordCategoryMap: { terms: string[]; categories: CommunityCategory[] }[] = [
  { terms: ['focus', 'memory', 'cognition', 'nootropic', 'brain', 'productivity', 'mental'], categories: ['Cognition'] },
  { terms: ['sleep', 'recovery', 'soreness', 'fatigue', 'relax'], categories: ['Recovery'] },
  { terms: ['strength', 'muscle', 'endurance', 'performance', 'athletic', 'training', 'creatine'], categories: ['Performance'] },
  { terms: ['longevity', 'aging', 'senolytic', 'nad'], categories: ['Longevity'] },
  { terms: ['mood', 'stress', 'anxiety', 'calm', 'cortisol', 'ashwagandha'], categories: ['Mood & Stress'] },
  { terms: ['metabolic', 'blood sugar', 'insulin', 'weight', 'fat loss', 'appetite'], categories: ['Metabolic Health'] },
  { terms: ['testosterone', 'hormone', 'libido', 'thyroid', 'fertility'], categories: ['Hormonal Health'] },
  { terms: ['gut', 'digestion', 'microbiome', 'bloating', 'probiotic'], categories: ['Digestive Health'] },
  { terms: ['heart', 'blood pressure', 'cholesterol', 'circulation'], categories: ['Heart Health'] },
  { terms: ['immune'], categories: ['Immune Health'] },
  { terms: ['pain', 'injury', 'inflammation'], categories: ['Pain & Injury'] },
  { terms: ['joint', 'mobility', 'tendon', 'ligament', 'bpc', 'tb-500'], categories: ['Joint & Mobility', 'Pain & Injury', 'Recovery'] },
  { terms: ['skin', 'hair', 'nails', 'acne', 'beauty'], categories: ['Beauty & Skin'] },
];

function normalizeCategories(text: string): CommunityCategory[] {
  const lower = text.toLowerCase();
  const found = keywordCategoryMap.flatMap(({ terms, categories }) =>
    terms.some((term) => lower.includes(term)) ? categories : [],
  );
  return Array.from(new Set(found)).slice(0, 3);
}

export const ENTITY_CATEGORY_OVERRIDES: Record<string, CommunityCategory[]> = {
  caffeine: ['Cognition', 'Performance'],
  'creatine-monohydrate': ['Performance', 'Cognition'],
  'magnesium-glycinate': ['Recovery', 'Mood & Stress'],
  ashwagandha: ['Mood & Stress', 'Hormonal Health'],
  melatonin: ['Recovery'],
  modafinil: ['Cognition'],
  'bpc-157': ['Pain & Injury', 'Joint & Mobility', 'Recovery'],
  'tb-500': ['Pain & Injury', 'Joint & Mobility', 'Recovery'],
};

export function getEntityCategories(entityType?: 'substance' | 'stack' | 'brand' | null, entityId?: string | null): CommunityCategory[] {
  if (!entityType || !entityId || entityType === 'brand') return [];
  const override = ENTITY_CATEGORY_OVERRIDES[entityId];
  if (override) return override;
  if (entityType === 'substance') {
    const substance = SUPPLEMENTS.find((item) => item.id === entityId);
    if (!substance) return [];
    return normalizeCategories(
      [
        substance.name,
        substance.description,
        substance.paths.map((path) => `${path.domain} ${path.category}`).join(' '),
        substance.subjectiveEffects.join(' '),
        substance.markers?.join(' ') ?? '',
      ].join(' '),
    );
  }
  const stack = STACKS.find((item) => item.id === entityId);
  if (!stack) return [];
  const fromText = normalizeCategories([stack.name, stack.description, stack.markers?.join(' ') ?? ''].join(' '));
  const fromComponents = stack.substances.flatMap((substance) => getEntityCategories('substance', substance.id));
  return Array.from(new Set([...fromText, ...fromComponents])).slice(0, 3);
}

export function getSuggestedBearings(entityType: 'substance' | 'stack' | 'brand' | null, entityId: string | null, postType: 'Dispatch' | 'Signal') {
  const allowed = postType === 'Dispatch' ? DISPATCH_BEARINGS : SIGNAL_BEARINGS;
  const categories = getEntityCategories(entityType, entityId);
  const suggestions = categories.flatMap((category) => CATEGORY_BEARING_SUGGESTIONS[category] ?? []);
  return Array.from(new Set(suggestions)).filter((bearing) => (allowed as readonly string[]).includes(bearing));
}
