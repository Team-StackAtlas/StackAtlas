import { Activity, Bandage, Bone, Brain, Flame, HeartPulse, Hourglass, Moon, Smile, Sparkles, Stethoscope, Zap, type LucideIcon } from 'lucide-react';

/** Lucide icon per canonical goal category, shared by the Map filter and rails. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Cognition': Brain,
  'Recovery': Moon,
  'Performance': Zap,
  'Longevity': Hourglass,
  'Mood & Stress': Smile,
  'Metabolic Health': Flame,
  'Hormonal Health': Activity,
  'Digestive Health': Stethoscope,
  'Heart Health': HeartPulse,
  'Pain & Injury': Bandage,
  'Joint & Mobility': Bone,
  'Beauty & Skin': Sparkles,
};
