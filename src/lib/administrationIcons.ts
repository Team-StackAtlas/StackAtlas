import { Pill, Syringe, SprayCan, Droplet, type LucideIcon } from 'lucide-react';
import type { AdministrationMethod } from '../data/mockData';

// Icon + clean label per administration method. The stored AdministrationMethod
// keeps its emoji (it's the data key); the UI renders the icon and plain label
// instead, matching the type-tag / category icon language.
export const ADMINISTRATION_META: Record<AdministrationMethod, { icon: LucideIcon; label: string }> = {
  '👄 Oral': { icon: Pill, label: 'Oral' },
  '💉 Injectable': { icon: Syringe, label: 'Injectable' },
  '🧴 Topical': { icon: SprayCan, label: 'Topical' },
  '👅 Sublingual': { icon: Droplet, label: 'Sublingual' },
};
