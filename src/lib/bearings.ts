export const BEARING_GROUPS = [
  { name: 'Cognitive', bearings: ['Focus', 'Memory', 'Brain Fog', 'Productivity', 'Motivation', 'Creativity', 'Learning', 'Concentration', 'Mental Clarity'] },
  { name: 'Sleep & Recovery', bearings: ['Sleep', 'Deep Sleep', 'Insomnia', 'Dreams', 'Relaxation', 'Recovery', 'Soreness', 'Fatigue'] },
  { name: 'Performance', bearings: ['Strength', 'Endurance', 'Energy', 'Athletic Performance', 'Muscle Growth', 'Pump', 'Training', 'Cardio', 'Reaction Time'] },
  { name: 'Mood', bearings: ['Mood', 'Anxiety', 'Stress', 'Calmness', 'Depression', 'Irritability', 'Confidence', 'Emotional Resilience'] },
  { name: 'Hormonal & Sexual', bearings: ['Libido', 'Testosterone', 'Estrogen', 'Thyroid', 'Fertility', 'Sexual Performance'] },
  { name: 'Metabolic', bearings: ['Weight Loss', 'Fat Loss', 'Appetite', 'Satiety', 'Blood Sugar', 'Insulin Sensitivity'] },
  { name: 'Digestive', bearings: ['Digestion', 'Gut Health', 'Bloating', 'Nausea', 'Microbiome'] },
  { name: 'Cardiovascular', bearings: ['Blood Pressure', 'Cholesterol', 'Circulation', 'Heart Rate'] },
  { name: 'Pain & Mobility', bearings: ['Pain', 'Injury Recovery', 'Mobility', 'Tendons', 'Ligaments', 'Joint Health'] },
  { name: 'Beauty', bearings: ['Skin Health', 'Hair Health', 'Nails', 'Acne', 'Looksmaxxing'] },
  { name: 'Experience', bearings: ['First Time Use', 'Long-Term Use', 'Dose Change', 'Interaction', 'Tolerance', 'Withdrawal', 'Dependency'] },
  { name: 'Training', bearings: ['Bodybuilding', 'Strongman', 'Powerlifting', 'Olympic Weightlifting', 'CrossFit', 'Running', 'Cycling', 'Combat Sports', 'Climbing', 'Hypertrophy', 'Sports Performance'] },
  { name: 'Traditional Medicine', bearings: ['East Asian Medicine', 'Ayurveda', 'Native American Medicine', 'Folk Medicine', 'Herbal Medicine', 'Western Herbalism'] },
  { name: 'Modern Context', bearings: ['Biohacking', 'Longevity', 'Clinical Use', 'Sports Nutrition'] },
  { name: 'Signal-only Discussion', bearings: ['Beginner Question', 'Stack Discussion', 'Protocol Discussion', 'Brand Experience', 'Product Quality', 'Cost / Value', 'Research', 'General Discussion'] },
];

export const SIGNAL_ONLY_BEARINGS = ['Beginner Question', 'Stack Discussion', 'Protocol Discussion', 'Brand Experience', 'Product Quality', 'Cost / Value', 'Research', 'General Discussion'];

export const BEARING_CATEGORIES = [
  { name: 'Cognition', description: 'Focus, memory, clarity, motivation, and productivity.', bearings: ['Focus', 'Memory', 'Brain Fog', 'Productivity', 'Motivation', 'Creativity', 'Learning', 'Concentration', 'Mental Clarity'] },
  { name: 'Recovery', description: 'Sleep, soreness, fatigue, relaxation, and recovery.', bearings: ['Sleep', 'Deep Sleep', 'Insomnia', 'Dreams', 'Relaxation', 'Recovery', 'Soreness', 'Fatigue'] },
  { name: 'Performance', description: 'Strength, endurance, energy, training, and output.', bearings: ['Strength', 'Endurance', 'Energy', 'Athletic Performance', 'Muscle Growth', 'Pump', 'Training', 'Cardio', 'Reaction Time'] },
  { name: 'Longevity', description: 'Long-term use, healthy aging, clinical use, and biohacking.', bearings: ['Long-Term Use', 'Longevity', 'Clinical Use', 'Biohacking'] },
  { name: 'Mood & Stress', description: 'Mood, anxiety, stress, calmness, and emotional resilience.', bearings: ['Mood', 'Anxiety', 'Stress', 'Calmness', 'Depression', 'Irritability', 'Confidence', 'Emotional Resilience'] },
  { name: 'Metabolic Health', description: 'Weight, appetite, blood sugar, insulin, and body composition.', bearings: ['Weight Loss', 'Fat Loss', 'Appetite', 'Satiety', 'Blood Sugar', 'Insulin Sensitivity'] },
  { name: 'Hormonal Health', description: 'Testosterone, estrogen, thyroid, libido, and fertility.', bearings: ['Libido', 'Testosterone', 'Estrogen', 'Thyroid', 'Fertility', 'Sexual Performance'] },
  { name: 'Digestive Health', description: 'Digestion, gut health, bloating, nausea, and microbiome.', bearings: ['Digestion', 'Gut Health', 'Bloating', 'Nausea', 'Microbiome'] },
  { name: 'Heart Health', description: 'Blood pressure, cholesterol, circulation, and heart rate.', bearings: ['Blood Pressure', 'Cholesterol', 'Circulation', 'Heart Rate'] },
  { name: 'Pain & Injury', description: 'Pain, injury recovery, tendons, ligaments, and mobility.', bearings: ['Pain', 'Injury Recovery', 'Mobility', 'Tendons', 'Ligaments', 'Joint Health'] },
  { name: 'Joint & Mobility', description: 'Joint health, mobility, tendons, ligaments, and movement quality.', bearings: ['Joint Health', 'Mobility', 'Tendons', 'Ligaments', 'Pain'] },
  { name: 'Beauty & Skin', description: 'Skin, hair, nails, acne, and appearance-focused outcomes.', bearings: ['Skin Health', 'Hair Health', 'Nails', 'Acne', 'Looksmaxxing'] },
];

export const CATEGORY_BEARING_SUGGESTIONS: Record<string, string[]> = Object.fromEntries(
  BEARING_CATEGORIES.flatMap(category => [[category.name, category.bearings], ...category.bearings.map(bearing => [bearing, category.bearings])]),
);
CATEGORY_BEARING_SUGGESTIONS['Strength & Muscle'] = CATEGORY_BEARING_SUGGESTIONS.Performance;
CATEGORY_BEARING_SUGGESTIONS.Hormones = CATEGORY_BEARING_SUGGESTIONS['Hormonal Health'];
CATEGORY_BEARING_SUGGESTIONS['Sexual Health'] = CATEGORY_BEARING_SUGGESTIONS['Hormonal Health'];
CATEGORY_BEARING_SUGGESTIONS['Fat Loss'] = CATEGORY_BEARING_SUGGESTIONS['Metabolic Health'];
CATEGORY_BEARING_SUGGESTIONS['Gut Health'] = CATEGORY_BEARING_SUGGESTIONS['Digestive Health'];
CATEGORY_BEARING_SUGGESTIONS.Sleep = CATEGORY_BEARING_SUGGESTIONS.Recovery;
CATEGORY_BEARING_SUGGESTIONS.Stress = CATEGORY_BEARING_SUGGESTIONS['Mood & Stress'];

export function getAllowedBearings(mode: 'dispatch' | 'signal') {
  return BEARING_GROUPS.flatMap(group => group.bearings).filter(bearing => mode === 'signal' || !SIGNAL_ONLY_BEARINGS.includes(bearing));
}

export function getFilterBearings(values: string[]) {
  return Array.from(new Set(values.flatMap(value => CATEGORY_BEARING_SUGGESTIONS[value] ?? [value])));
}

// Old route categories (Mind/Body/Vitality taxonomy) mapped into the twelve
// canonical categories. Route categories with no canonical home (Popular,
// Beginner-Friendly, Novel) are intentionally unmapped.
const ROUTE_CATEGORY_TO_CANONICAL: Record<string, string> = {
  Focus: 'Cognition',
  Memory: 'Cognition',
  Sleep: 'Recovery',
  Recovery: 'Recovery',
  Endurance: 'Performance',
  'Strength & Muscle': 'Performance',
  Longevity: 'Longevity',
  Stress: 'Mood & Stress',
  Mood: 'Mood & Stress',
  'Fat Loss': 'Metabolic Health',
  'Metabolic Health': 'Metabolic Health',
  Hormones: 'Hormonal Health',
  'Sexual Health': 'Hormonal Health',
  'Gut Health': 'Digestive Health',
};

/** Canonical category names for a substance's route categories, in canonical order. */
export function getCanonicalCategories(routeCategories: string[]): string[] {
  const mapped = new Set(
    routeCategories.map(category => ROUTE_CATEGORY_TO_CANONICAL[category]).filter(Boolean),
  );
  return BEARING_CATEGORIES.map(category => category.name).filter(name => mapped.has(name));
}
