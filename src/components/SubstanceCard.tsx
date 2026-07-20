import { Link } from 'react-router-dom';
import { Pill, Syringe, Droplet, SprayCan, type LucideIcon } from 'lucide-react';
import { TYPE_TAGS, type Substance } from '../data/mockData';
import { cn } from '../lib/utils';
import AccessBadge from './AccessBadge';
import { SecondaryHideMenu } from './SecondaryHideMenu';

const ADMINISTRATION_ICONS: Record<string, LucideIcon> = {
  'Oral': Pill,
  'Injectable': Syringe,
  'Topical': SprayCan,
  'Sublingual': Droplet,
};

/**
 * Browse-grid card for a substance: name, classification, a couple of type
 * tags, a description clamp, and administration methods. Used on the Map;
 * kept intentionally scannable and free of decorative clutter.
 */
export function SubstanceCard({ supplement, isPrioritized, isHiddenByUser, onClick }: {
  supplement: Substance;
  isPrioritized: boolean;
  isHiddenByUser: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={`/substance/${supplement.id}`}
      onClick={onClick}
      className={cn(
        "block p-5 rounded-2xl border transition-all group flex flex-col h-full",
        isPrioritized
          ? "bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30 hover:border-emerald-300 dark:hover:border-emerald-700/50 shadow-sm"
          : "bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm"
      )}
    >
      <div className="flex flex-col mb-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
            {supplement.name}
          </h3>
          <div className="flex gap-1 shrink-0 ml-3 items-start">
            <AccessBadge classification={supplement.classification} />
            <SecondaryHideMenu id={supplement.id} name={supplement.name} type="substance" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {supplement.typeTags.slice(0, 2).map(tag => {
            const typeInfo = TYPE_TAGS.find(t => t.full === tag);
            return typeInfo ? (
              <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-400" title={tag}>
                {typeInfo.emoji} {typeInfo.label}
              </span>
            ) : null;
          })}
        </div>
      </div>

      <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        {supplement.description}
      </p>
      {supplement.markers && supplement.markers.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {supplement.markers.slice(0, 2).map(marker => (
            <span key={marker} className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-zinc-800/60 dark:text-zinc-500">
              {marker}
            </span>
          ))}
        </div>
      )}
      {isHiddenByUser && (
        <span className="mb-3 inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hidden by current user</span>
      )}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-zinc-800/50">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          {supplement.classification}
        </div>
        <div className="flex gap-1.5">
          {supplement.administration.map(admin => {
            const label = admin.split(' ').slice(1).join(' ');
            const Icon = ADMINISTRATION_ICONS[label];
            return (
              <span key={admin} className="flex items-center justify-center rounded-md bg-slate-50 p-1.5 dark:bg-zinc-800/50" title={label}>
                {Icon ? <Icon size={14} className="text-slate-500 dark:text-zinc-400" /> : null}
              </span>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
