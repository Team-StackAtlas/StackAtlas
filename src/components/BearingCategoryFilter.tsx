import { ChevronRight, X } from 'lucide-react';
import { BEARING_CATEGORIES } from '../lib/bearings';
import { cn } from '../lib/utils';

export function BearingCategoryFilter({ selectedCategory, selectedBearings, onCategoryChange, onBearingToggle, onReset }: {
  selectedCategory: string | null;
  selectedBearings: string[];
  onCategoryChange: (category: string) => void;
  onBearingToggle: (bearing: string) => void;
  onReset: () => void;
}) {
  const category = BEARING_CATEGORIES.find(item => item.name === selectedCategory);
  return (
    <div className="px-4 pb-3">
      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
        {BEARING_CATEGORIES.map(item => {
          const selected = item.name === selectedCategory;
          return (
            <button key={item.name} type="button" onClick={() => onCategoryChange(item.name)} className={cn('flex min-h-24 w-72 shrink-0 items-center gap-3 rounded-2xl border bg-white p-4 text-left transition-all dark:bg-zinc-900 sm:w-80', selected ? 'border-emerald-300 ring-2 ring-emerald-100 dark:border-emerald-500/50 dark:ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-zinc-800 dark:hover:border-zinc-700')}>
              <span className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950" aria-hidden="true" />
              <span className="min-w-0 flex-1"><span className="block font-bold text-slate-900 dark:text-zinc-100">{item.name}</span><span className="mt-1 block text-sm leading-snug text-slate-500 dark:text-zinc-400">{item.description}</span></span>
              <ChevronRight size={18} className={cn('shrink-0 text-slate-400', selected && 'text-emerald-500')} />
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
