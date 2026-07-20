import { Pill, Leaf, Utensils, Cross, Dna, FlaskConical, type LucideIcon } from 'lucide-react';
import type { TypeTag } from '../data/mockData';

// Lucide icon per substance type tag. The stored TypeTag keeps its emoji (it's
// the data key), but the UI renders these icons instead for a consistent,
// premium look — matching the administration/category icons used elsewhere.
export const TYPE_TAG_ICONS: Record<TypeTag, LucideIcon> = {
  '💊 Supplement': Pill,
  '🌿 Botanical': Leaf,
  '🍽️ Food / Drink': Utensils,
  '🏥 Pharmaceutical': Cross,
  '🧬 Peptide': Dna,
  '🧪 Research Compound': FlaskConical,
};
