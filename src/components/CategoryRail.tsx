import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { Substance } from '../data/mockData';
import { ACCENTS, type Accent } from './ui/accents';
import { SubstanceVisual } from './SubstanceVisual';
import { displayName } from '../lib/substanceName';
import { cn } from '../lib/utils';

/**
 * One horizontal discovery row for a goal category on the Map landing
 * state: a few compact substance cards, scrollable, with a "See all" that
 * hands off to the existing category filter. Picks are real data (the
 * category's substances, most-sourced first), never a trending label.
 */
export function CategoryRail({ name, description, icon: Icon, accent, substances, onSeeAll }: {
  name: string;
  description: string;
  icon: LucideIcon;
  accent: Accent;
  substances: Substance[];
  onSeeAll: () => void;
}) {
  if (substances.length === 0) return null;
  const kit = ACCENTS[accent];
  return (
    <section aria-label={`${name} picks`}>
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn(kit.iconTile, 'mb-0 h-9 w-9 shrink-0 rounded-lg')}><Icon size={16} className="text-white" /></span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold leading-tight text-slate-900 dark:text-zinc-100">{name}</h2>
            <p className="truncate text-xs text-slate-500 dark:text-zinc-400">{description}</p>
          </div>
        </div>
        <button type="button" onClick={onSeeAll} className={cn('inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold hover:underline', kit.cta)}>
          See all <ChevronRight size={15} />
        </button>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 hide-scrollbar scroll-fade-r snap-x">
        {substances.map((s) => {
          const { primary, acronym } = displayName(s);
          return (
            <Link
              key={s.id}
              to={`/substance/${s.id}`}
              className="group flex w-[15.5rem] shrink-0 snap-start items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
            >
              <SubstanceVisual substance={s} size="md" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 break-words text-[15px] font-bold leading-tight text-slate-900 group-hover:text-emerald-700 dark:text-zinc-50 dark:group-hover:text-emerald-400">
                  {acronym ? `${acronym} · ${primary}` : primary}
                </span>
                <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">{s.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
