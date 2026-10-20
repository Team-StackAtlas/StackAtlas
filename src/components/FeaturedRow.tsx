import { Link } from 'react-router-dom';
import { BookOpen, Layers, Star, Target, type LucideIcon } from 'lucide-react';
import type { FeaturedPick, FeaturedReason, FeaturedTile } from '../lib/featuredPicks';
import { MonogramTile, SubstanceVisual } from './SubstanceVisual';
import { cn } from '../lib/utils';

const REASON_ICON: Record<FeaturedReason, LucideIcon> = { sources: BookOpen, goal: Target, stack: Layers, brand: Star };

function Tile({ tile }: { tile: FeaturedTile }) {
  if (tile.kind === 'substance') return <SubstanceVisual substance={tile.substance} size="lg" />;
  if (tile.kind === 'brand') return <MonogramTile label={tile.label} accent={tile.accent} size="lg" />;
  return (
    <span className={cn('grid h-24 w-24 shrink-0 gap-1 overflow-hidden rounded-2xl bg-slate-100 p-1 dark:bg-zinc-800', tile.members.length <= 1 ? 'grid-cols-1' : 'grid-cols-2')} aria-hidden>
      {tile.members.map((m) => <SubstanceVisual key={m.id} substance={m} size="sm" className="h-full w-full rounded-lg text-xs" />)}
    </span>
  );
}

/** Compact featured strip for the Map landing state; see lib/featuredPicks for how slots are chosen. */
export function FeaturedRow({ picks }: { picks: FeaturedPick[] }) {
  if (picks.length === 0) return null;
  return (
    <section aria-label="Featured" className={cn('grid gap-3', picks.length === 1 ? 'grid-cols-1' : picks.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3')}>
      {picks.map((p) => {
        const Icon = REASON_ICON[p.reason];
        return (
          <Link
            key={p.key}
            to={p.to}
            className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5 dark:border-zinc-800 dark:from-zinc-900/70 dark:to-zinc-900/30 dark:hover:border-zinc-700"
          >
            <Tile tile={p.tile} />
            <span className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                <Icon size={11} /> {p.eyebrow}
              </span>
              <span className="mt-1 block text-lg font-bold leading-tight tracking-tight text-slate-900 group-hover:text-emerald-700 dark:text-zinc-50 dark:group-hover:text-emerald-400">{p.title}</span>
              <span className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600 dark:text-zinc-400">{p.description}</span>
            </span>
          </Link>
        );
      })}
    </section>
  );
}
