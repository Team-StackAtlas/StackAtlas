import { Link } from 'react-router-dom';
import { TYPE_TAGS, type Classification, type Substance } from '../data/mockData';
import { TYPE_TAG_ICONS } from '../lib/typeTagIcons';
import { ADMINISTRATION_META } from '../lib/administrationIcons';
import { displayName } from '../lib/substanceName';
import { cn } from '../lib/utils';
import { SecondaryHideMenu } from './SecondaryHideMenu';

/**
 * Soft classification pill. "Unknown" is intentionally absent — a bare "?"
 * badge read as noise on the many imported entries that lack a classification,
 * so those cards simply omit the pill.
 */
const CLASSIFICATION_PILL: Record<Exclude<Classification, 'Unknown'>, string> = {
  Everyday: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25',
  Clinical: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25',
  Frontier: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-purple-400/25',
};

/**
 * Browse-grid card for a substance. Leads with the name (popular acronym first
 * when there is one), keeps the description scannable, and tucks classification
 * and administration into a quiet footer so the card reads as something worth
 * clicking rather than a data row.
 */
export function SubstanceCard({ supplement, isPrioritized, isHiddenByUser, onClick }: {
  supplement: Substance;
  isPrioritized: boolean;
  isHiddenByUser: boolean;
  onClick?: () => void;
}) {
  const { primary, acronym, altNames } = displayName(supplement);
  const classification = supplement.classification;

  return (
    <Link
      to={`/substance/${supplement.id}`}
      onClick={onClick}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border p-4 transition-all duration-200",
        isPrioritized
          ? "border-emerald-200/70 bg-emerald-50/40 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5 dark:border-emerald-800/40 dark:bg-emerald-900/10 dark:hover:border-emerald-700/60"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:shadow-black/30"
      )}
    >
      {isPrioritized && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-emerald-400 dark:bg-emerald-500/70" />
      )}

      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-[17px] font-bold leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-zinc-50 dark:group-hover:text-emerald-400">
          {acronym ? (
            <>
              <span>{acronym}</span>
              <span className="font-medium text-slate-400 dark:text-zinc-500"> · {primary}</span>
            </>
          ) : (
            <span className="line-clamp-2">{primary}</span>
          )}
        </h3>
        <SecondaryHideMenu id={supplement.id} name={supplement.name} type="substance" />
      </div>

      {altNames.length > 0 && (
        <p className="mb-2 truncate text-[11px] text-slate-400 dark:text-zinc-500" title={altNames.join(' · ')}>
          {altNames.slice(0, 3).join(' · ')}
        </p>
      )}

      {/* flex-1 lives on the wrapper: putting it on the clamped element itself
          stretches the -webkit-box past its clamp height, so text hard-clips
          at the card edge with no ellipsis. */}
      <div className="flex-1">
        <p className="line-clamp-3 text-[13px] leading-relaxed text-slate-600 dark:text-zinc-400">
          {supplement.description}
        </p>
      </div>

      {isHiddenByUser && (
        <span className="mt-2 inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hidden by current user</span>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-zinc-800/60">
        <div className="flex min-w-0 items-center gap-1.5">
          {classification !== 'Unknown' && (
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset", CLASSIFICATION_PILL[classification])}>
              {classification}
            </span>
          )}
          {supplement.typeTags.slice(0, 1).map(tag => {
            const typeInfo = TYPE_TAGS.find(t => t.full === tag);
            const TagIcon = TYPE_TAG_ICONS[tag];
            return typeInfo ? (
              <span key={tag} className="inline-flex min-w-0 items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400" title={tag}>
                {TagIcon && <TagIcon size={12} className="shrink-0 text-slate-400 dark:text-zinc-500" />}
                <span className="truncate">{typeInfo.label}</span>
              </span>
            ) : null;
          })}
        </div>
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
