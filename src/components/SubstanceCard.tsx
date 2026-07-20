import { Link } from 'react-router-dom';
import { TYPE_TAGS, type Substance } from '../data/mockData';
import { TYPE_TAG_ICONS } from '../lib/typeTagIcons';
import { ADMINISTRATION_META } from '../lib/administrationIcons';
import { cn } from '../lib/utils';
import AccessBadge from './AccessBadge';
import { SecondaryHideMenu } from './SecondaryHideMenu';

/**
 * Browse-grid card for a substance: name, classification, a couple of type
 * tags, a description clamp, and administration methods. Used on the Map;
 * kept intentionally compact, scannable, and free of decorative clutter so
 * many cards read cleanly per screen.
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
        "group relative flex h-full flex-col rounded-xl border p-3.5 transition-all duration-200",
        isPrioritized
          ? "border-emerald-200/70 bg-emerald-50/40 hover:border-emerald-300 hover:shadow-sm hover:shadow-emerald-900/5 dark:border-emerald-800/40 dark:bg-emerald-900/10 dark:hover:border-emerald-700/60"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:shadow-black/20"
      )}
    >
      {isPrioritized && (
        <span aria-hidden className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-emerald-400 dark:bg-emerald-500/70" />
      )}

      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <AccessBadge classification={supplement.classification} />
          <h3 className="truncate text-[15px] font-semibold leading-tight text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-zinc-100 dark:group-hover:text-emerald-400">
            {supplement.name}
          </h3>
        </div>
        <SecondaryHideMenu id={supplement.id} name={supplement.name} type="substance" />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {supplement.typeTags.slice(0, 2).map(tag => {
          const typeInfo = TYPE_TAGS.find(t => t.full === tag);
          const TagIcon = TYPE_TAG_ICONS[tag];
          return typeInfo ? (
            <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-400" title={tag}>
              {TagIcon && <TagIcon size={11} className="text-slate-400 dark:text-zinc-500" />}
              {typeInfo.label}
            </span>
          ) : null;
        })}
        {supplement.markers?.slice(0, 1).map(marker => (
          <span key={marker} title={marker} className="inline-block max-w-[150px] truncate rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-400 ring-1 ring-inset ring-slate-200 dark:text-zinc-500 dark:ring-zinc-800">
            {marker}
          </span>
        ))}
      </div>

      <p className="line-clamp-2 flex-1 text-[12.5px] leading-snug text-slate-600 dark:text-zinc-400">
        {supplement.description}
      </p>

      {isHiddenByUser && (
        <span className="mt-2 inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hidden by current user</span>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-zinc-800/60">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-600">
          {supplement.classification}
        </span>
        <div className="flex shrink-0 gap-1">
          {supplement.administration.map(admin => {
            const meta = ADMINISTRATION_META[admin];
            const Icon = meta?.icon;
            return (
              <span key={admin} className="flex items-center justify-center rounded-md bg-slate-50 p-1 dark:bg-zinc-800/50" title={meta?.label ?? admin}>
                {Icon ? <Icon size={12} className="text-slate-500 dark:text-zinc-400" /> : null}
              </span>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
