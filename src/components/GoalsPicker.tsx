import { Check } from 'lucide-react';
import { BEARING_CATEGORIES } from '../lib/bearings';
import { cn } from '../lib/utils';

/**
 * The twelve canonical goal categories as a multi-select grid. Shared by
 * onboarding (first-run) and the Profile preferences card (edit any time), so
 * both stay in sync with the categories that actually drive feed ranking.
 */
export function GoalsPicker({ selected, onToggle }: { selected: string[]; onToggle: (name: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {BEARING_CATEGORIES.map((category) => {
        const active = selected.includes(category.name);
        return (
          <button
            key={category.name}
            type="button"
            onClick={() => onToggle(category.name)}
            aria-pressed={active}
            className={cn(
              'flex items-start gap-3 rounded-2xl border p-4 text-left transition-all',
              active
                ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 dark:bg-emerald-500/10'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                active ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-zinc-600',
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
