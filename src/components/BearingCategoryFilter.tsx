import { Activity, Bandage, Bone, ChevronRight, Flame, HeartPulse, Hourglass, Moon, Sparkles, Stethoscope, Smile, Tag, X, type LucideIcon, Brain, Zap } from 'lucide-react';
import { BEARING_CATEGORIES } from '../lib/bearings';
import { cn } from '../lib/utils';

const DEFAULT_CATEGORY_ICON = Tag;

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

export function BearingCategoryFilter({ selectedCategory, selectedBearings, onCategoryChange, onBearingToggle, onReset, compact = false }: {
  selectedCategory: string | null;
  selectedBearings: string[];
  onCategoryChange: (category: string) => void;
  onBearingToggle: (bearing: string) => void;
  onReset: () => void;
  /** Compact chip row that fits a narrow centered column (used on the Square);
   * default false renders the full-width scrolling cards (used on the Map). */
  compact?: boolean;
}) {
  const category = BEARING_CATEGORIES.find(item => item.name === selectedCategory);

  if (compact) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pb-2">
        <div className="flex flex-wrap gap-2">
          {BEARING_CATEGORIES.map(item => {
            const selected = item.name === selectedCategory;
            const Icon = CATEGORY_ICONS[item.name] ?? DEFAULT_CATEGORY_ICON;
            return (
              <button key={item.name} type="button" onClick={() => onCategoryChange(item.name)} aria-pressed={selected} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors', selected ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200')}>
                <Icon size={15} className={selected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'} />
                {item.name}
              </button>
            );
          })}
        </div>
        {category && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Filter by {category.name}</p><button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"><X size={14}/> Reset</button></div>
            <div className="flex flex-wrap gap-2">{category.bearings.map(bearing => <button key={bearing} type="button" onClick={() => onBearingToggle(bearing)} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', selectedBearings.includes(bearing) ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800')}>{bearing}</button>)}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pb-3">
      <div className="flex gap-2.5 overflow-x-auto pb-2 hide-scrollbar">
        {BEARING_CATEGORIES.map(item => {
          const selected = item.name === selectedCategory;
          const Icon = CATEGORY_ICONS[item.name] ?? DEFAULT_CATEGORY_ICON;
          return (
            <button key={item.name} type="button" onClick={() => onCategoryChange(item.name)} aria-pressed={selected} className={cn('group flex w-56 shrink-0 items-center gap-2.5 rounded-xl border bg-white p-2.5 text-left transition-all sm:w-60 dark:bg-zinc-900', selected ? 'border-emerald-300 bg-emerald-50/40 shadow-sm shadow-emerald-900/5 dark:border-emerald-500/50 dark:bg-emerald-500/5' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm hover:shadow-slate-900/5 dark:border-zinc-800 dark:hover:border-zinc-700')}>
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors', selected ? 'bg-emerald-500 text-white dark:bg-emerald-500/90' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:group-hover:bg-emerald-500/20')} aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1"><span className={cn('block truncate text-sm font-semibold', selected ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-zinc-100')}>{item.name}</span><span className="mt-0.5 line-clamp-1 block text-[11.5px] leading-snug text-slate-500 dark:text-zinc-400">{item.description}</span></span>
              <ChevronRight size={16} className={cn('shrink-0 transition-colors', selected ? 'text-emerald-500' : 'text-slate-300 group-hover:text-slate-400 dark:text-zinc-600')} />
            </button>
          );
        })}
      </div>
      {category && (
        <div className="mt-2">
          <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Filter by {category.name}</p><button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"><X size={14}/> Reset</button></div>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">{category.bearings.map(bearing => <button key={bearing} type="button" onClick={() => onBearingToggle(bearing)} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium', selectedBearings.includes(bearing) ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800')}>{bearing}</button>)}</div>
        </div>
      )}
    </div>
  );
}
