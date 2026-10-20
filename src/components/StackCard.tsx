import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import type { Stack, Substance } from '../data/mockData';
import { SubstanceVisual } from './SubstanceVisual';
import { SecondaryHideMenu } from './SecondaryHideMenu';
import { cn } from '../lib/utils';

/**
 * Browse card for a user-created stack. Its identity is a composition of
 * its constituents' tiles, so stacks never need sourced imagery.
 */
export function StackCard({ stack, substancesById, creatorUsername, isHiddenByUser, onClick }: {
  stack: Stack;
  substancesById: Map<string, Substance>;
  creatorUsername?: string;
  isHiddenByUser: boolean;
  onClick?: () => void;
}) {
  const members = stack.substances.map((s) => substancesById.get(s.id)).filter((s): s is Substance => !!s).slice(0, 4);
  const extra = stack.substances.length - members.length;
  return (
    <Link
      to={`/stack/${stack.id}`}
      onClick={onClick}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:shadow-black/30"
    >
      <div className="flex items-start gap-3">
        <span className={cn('grid h-14 w-14 shrink-0 gap-0.5 overflow-hidden rounded-xl bg-slate-100 p-0.5 dark:bg-zinc-800', members.length <= 1 ? 'grid-cols-1' : 'grid-cols-2')} aria-hidden>
          {members.length === 0 ? (
            <span className="flex items-center justify-center text-slate-400"><Layers size={20} /></span>
          ) : (
            members.map((m) => <SubstanceVisual key={m.id} substance={m} size="sm" className="h-full w-full rounded-md text-[9px]" />)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 break-words text-[17px] font-bold leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-zinc-50 dark:group-hover:text-emerald-400">{stack.name}</h3>
            <div className="flex shrink-0 items-center gap-2">
              {stack.status === 'pending' && <span className="rounded px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Pending review</span>}
              <SecondaryHideMenu id={stack.id} name={stack.name} type="stack" />
            </div>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-zinc-400">
            {stack.substances.map((s) => s.name).join(' · ')}
          </p>
        </div>
      </div>
      {isHiddenByUser && (
        <span className="mt-2 inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hidden by current user</span>
      )}
      <div className="mt-3 flex-1">
        <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-600 dark:text-zinc-400">{stack.description}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-zinc-800/60 dark:text-zinc-400">
        <span>{stack.substances.length} {stack.substances.length === 1 ? 'substance' : 'substances'}{extra > 0 ? '' : ''}</span>
        {creatorUsername && <span className="min-w-0 truncate">by <span className="font-medium text-slate-700 dark:text-zinc-300">@{creatorUsername}</span></span>}
      </div>
    </Link>
  );
}
