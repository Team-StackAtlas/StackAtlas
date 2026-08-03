import { Check } from 'lucide-react';
import { BEARING_CATEGORIES } from '../lib/bearings';
import { cn } from '../lib/utils';
import { ACCENTS, type Accent } from './ui/accents';

// Each goal category wears one of the accent kits, cycled in a stable order so
// the grid reads as vibrantly as the Create / Glossary cards.
const GOAL_ACCENTS: Accent[] = ['emerald', 'blue', 'purple', 'amber', 'rose', 'teal'];

// Per-accent active-state treatment (border + tint + ring). Full literal
// strings so Tailwind's purge keeps them.
const ACTIVE_RING: Record<Accent, string> = {
  emerald: 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 dark:bg-emerald-500/10',
  blue: 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-500/10',
  purple: 'border-purple-500 bg-purple-50 ring-1 ring-purple-500 dark:bg-purple-500/10',
  amber: 'border-amber-500 bg-amber-50 ring-1 ring-amber-500 dark:bg-amber-500/10',
  rose: 'border-rose-500 bg-rose-50 ring-1 ring-rose-500 dark:bg-rose-500/10',
  teal: 'border-teal-500 bg-teal-50 ring-1 ring-teal-500 dark:bg-teal-500/10',
};

/**
 * The twelve canonical goal categories as a multi-select grid. Shared by
 * onboarding (first-run) and the Profile preferences card (edit any time), so
 * both stay in sync with the categories that actually drive feed ranking.
 */
export function GoalsPicker({ selected, onToggle }: { selected: string[]; onToggle: (name: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {BEARING_CATEGORIES.map((category, index) => {
        const accent = GOAL_ACCENTS[index % GOAL_ACCENTS.length];
        const kit = ACCENTS[accent];
        const active = selected.includes(category.name);
        return (
          <button
            key={category.name}
            type="button"
            onClick={() => onToggle(category.name)}
            aria-pressed={active}
            className={cn(
              'flex items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5',
              active
                ? ACTIVE_RING[accent]
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-white transition-colors',
                active ? cn('border-transparent', kit.dot) : 'border-slate-300 dark:border-zinc-600',
              )}
            >
              {active && <Check size={12} />}
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900 dark:text-zinc-100">{category.name}</span>
              <span className="block text-xs text-slate-500 dark:text-zinc-400">{category.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
