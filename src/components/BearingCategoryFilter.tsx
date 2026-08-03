import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Bandage, Bone, ChevronLeft, ChevronRight, Flame, HeartPulse, Hourglass, Moon, Sparkles, Stethoscope, Smile, Tag, X, type LucideIcon, Brain, Zap } from 'lucide-react';
import { BEARING_CATEGORIES } from '../lib/bearings';
import { useGoals } from '../hooks/useGoals';
import { cn } from '../lib/utils';
import { scrollBehavior } from '../lib/motion';
import { ACCENT_CYCLE, type Accent } from './ui/accents';

const DEFAULT_CATEGORY_ICON = Tag;

// Per-accent treatments for the compact rail card. Full literal strings so
// Tailwind's purge keeps them; colors track ACCENT_CYCLE by canonical index,
// matching GoalsPicker so a category wears the same accent everywhere.
const RAIL_TILE_SOFT: Record<Accent, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 dark:bg-emerald-600/10 dark:text-emerald-400 dark:group-hover:bg-emerald-700/20',
  blue: 'bg-blue-50 text-blue-700 group-hover:bg-blue-100 dark:bg-blue-600/10 dark:text-blue-400 dark:group-hover:bg-blue-700/20',
  purple: 'bg-purple-50 text-purple-700 group-hover:bg-purple-100 dark:bg-purple-600/10 dark:text-purple-400 dark:group-hover:bg-purple-700/20',
  amber: 'bg-amber-50 text-amber-700 group-hover:bg-amber-100 dark:bg-amber-600/10 dark:text-amber-400 dark:group-hover:bg-amber-700/20',
  rose: 'bg-rose-50 text-rose-700 group-hover:bg-rose-100 dark:bg-rose-600/10 dark:text-rose-400 dark:group-hover:bg-rose-700/20',
  teal: 'bg-teal-50 text-teal-700 group-hover:bg-teal-100 dark:bg-teal-600/10 dark:text-teal-400 dark:group-hover:bg-teal-700/20',
};

const RAIL_TILE_SOLID: Record<Accent, string> = {
  emerald: 'bg-emerald-700 text-white dark:bg-emerald-600/90',
  blue: 'bg-blue-700 text-white dark:bg-blue-600/90',
  purple: 'bg-purple-700 text-white dark:bg-purple-600/90',
  amber: 'bg-amber-600 text-white dark:bg-amber-600/90',
  rose: 'bg-rose-700 text-white dark:bg-rose-600/90',
  teal: 'bg-teal-700 text-white dark:bg-teal-600/90',
};

const RAIL_CARD_SELECTED: Record<Accent, string> = {
  emerald: 'border-emerald-300 bg-emerald-50/40 shadow-sm shadow-emerald-900/5 dark:border-emerald-500/50 dark:bg-emerald-500/5',
  blue: 'border-blue-300 bg-blue-50/40 shadow-sm shadow-blue-900/5 dark:border-blue-500/50 dark:bg-blue-500/5',
  purple: 'border-purple-300 bg-purple-50/40 shadow-sm shadow-purple-900/5 dark:border-purple-500/50 dark:bg-purple-500/5',
  amber: 'border-amber-300 bg-amber-50/40 shadow-sm shadow-amber-900/5 dark:border-amber-500/50 dark:bg-amber-500/5',
  rose: 'border-rose-300 bg-rose-50/40 shadow-sm shadow-rose-900/5 dark:border-rose-500/50 dark:bg-rose-500/5',
  teal: 'border-teal-300 bg-teal-50/40 shadow-sm shadow-teal-900/5 dark:border-teal-500/50 dark:bg-teal-500/5',
};

const RAIL_TITLE_SELECTED: Record<Accent, string> = {
  emerald: 'text-emerald-900 dark:text-emerald-200',
  blue: 'text-blue-900 dark:text-blue-200',
  purple: 'text-purple-900 dark:text-purple-200',
  amber: 'text-amber-900 dark:text-amber-200',
  rose: 'text-rose-900 dark:text-rose-200',
  teal: 'text-teal-900 dark:text-teal-200',
};

const RAIL_CHEVRON_SELECTED: Record<Accent, string> = {
  emerald: 'text-emerald-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  amber: 'text-amber-500',
  rose: 'text-rose-500',
  teal: 'text-teal-500',
};

function accentFor(name: string): Accent {
  const index = BEARING_CATEGORIES.findIndex(item => item.name === name);
  return ACCENT_CYCLE[(index < 0 ? 0 : index) % ACCENT_CYCLE.length];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
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

export function BearingCategoryFilter({ selectedCategory, selectedBearings, onCategoryChange, onBearingToggle, onReset }: {
  selectedCategory: string | null;
  selectedBearings: string[];
  onCategoryChange: (category: string) => void;
  onBearingToggle: (bearing: string) => void;
  onReset: () => void;
}) {
  const category = BEARING_CATEGORIES.find(item => item.name === selectedCategory);
  const { goals } = useGoals();

  // The user's goal categories lead the rail; the rest keep canonical order.
  const orderedCategories = useMemo(() => {
    if (goals.length === 0) return BEARING_CATEGORIES;
    const goalSet = new Set(goals);
    return [...BEARING_CATEGORIES.filter(item => goalSet.has(item.name)), ...BEARING_CATEGORIES.filter(item => !goalSet.has(item.name))];
  }, [goals]);

  // The rail hides its scrollbar, so paddles + edge fades are the scroll
  // affordance — without them the categories past the fold are invisible.
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updatePaddles = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setCanLeft(rail.scrollLeft > 4);
    setCanRight(rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 4);
  }, []);

  useEffect(() => {
    updatePaddles();
    window.addEventListener('resize', updatePaddles);
    return () => window.removeEventListener('resize', updatePaddles);
  }, [updatePaddles]);

  const nudge = (direction: 1 | -1) => {
    railRef.current?.scrollBy({ left: direction * railRef.current.clientWidth * 0.8, behavior: scrollBehavior() });
  };

  return (
    <div className="px-4 pb-3">
      <div className="relative">
        <div ref={railRef} onScroll={updatePaddles} className="flex gap-2.5 overflow-x-auto pb-2 hide-scrollbar">
          {orderedCategories.map(item => {
            const selected = item.name === selectedCategory;
            const Icon = CATEGORY_ICONS[item.name] ?? DEFAULT_CATEGORY_ICON;
            const accent = accentFor(item.name);
            return (
              <button key={item.name} type="button" onClick={() => onCategoryChange(item.name)} aria-pressed={selected} className={cn('group flex w-56 shrink-0 items-center gap-2.5 rounded-xl border bg-white p-2.5 text-left transition-all sm:w-60 dark:bg-zinc-900', selected ? RAIL_CARD_SELECTED[accent] : 'border-slate-200 hover:border-slate-300 hover:shadow-sm hover:shadow-slate-900/5 dark:border-zinc-800 dark:hover:border-zinc-700')}>
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors', selected ? RAIL_TILE_SOLID[accent] : RAIL_TILE_SOFT[accent])} aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1"><span className={cn('block truncate text-sm font-semibold', selected ? RAIL_TITLE_SELECTED[accent] : 'text-slate-900 dark:text-zinc-100')}>{item.name}</span><span className="mt-0.5 line-clamp-1 block text-[11.5px] leading-snug text-slate-500 dark:text-zinc-400">{item.description}</span></span>
                <ChevronRight size={16} className={cn('shrink-0 transition-colors', selected ? RAIL_CHEVRON_SELECTED[accent] : 'text-slate-300 group-hover:text-slate-500 dark:text-zinc-600')} />
              </button>
            );
          })}
        </div>
        {canLeft && (
          <>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent dark:from-zinc-950" />
            <button type="button" onClick={() => nudge(-1)} aria-label="Scroll categories left" className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 shadow-md transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <ChevronLeft size={16} />
            </button>
          </>
        )}
        {canRight && (
          <>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent dark:from-zinc-950" />
            <button type="button" onClick={() => nudge(1)} aria-label="Scroll categories right" className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 shadow-md transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      {category && (
        <div className="mt-2">
          <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Filter by {category.name}</p><button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"><X size={14}/> Reset</button></div>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">{category.bearings.map(bearing => <button key={bearing} type="button" onClick={() => onBearingToggle(bearing)} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium', selectedBearings.includes(bearing) ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800')}>{bearing}</button>)}</div>
        </div>
      )}
    </div>
  );
}
