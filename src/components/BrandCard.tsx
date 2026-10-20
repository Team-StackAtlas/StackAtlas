import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Star, Truck } from 'lucide-react';
import type { Brand } from '../data/mockData';
import { brandIdentity } from '../lib/visualIdentity';
import { MonogramTile } from './SubstanceVisual';
import { SecondaryHideMenu } from './SecondaryHideMenu';

/**
 * Browse card for a brand: monogram tile (an approved logo can replace it
 * later via media assets), name, one line, and the trust row that is the
 * reason people look at brands here at all.
 */
export function BrandCard({ brand, isHiddenByUser, onClick }: { brand: Brand; isHiddenByUser: boolean; onClick?: () => void }) {
  const id = brandIdentity(brand);
  const hasRatings = (brand.ratingCount ?? 0) > 0 && brand.userRating > 0;
  return (
    <Link
      to={`/brand/${brand.id}`}
      onClick={onClick}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:shadow-black/30"
    >
      <div className="flex items-start gap-3">
        <MonogramTile label={id.label} accent={id.accent} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 break-words text-[17px] font-bold leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-zinc-50 dark:group-hover:text-emerald-400">{brand.name}</h3>
            <SecondaryHideMenu id={brand.id} name={brand.name} type="brand" />
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            {hasRatings ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                <Star size={12} className="fill-current" /> {brand.userRating.toFixed(1)}
                <span className="font-normal text-slate-500 dark:text-zinc-400">({brand.ratingCount})</span>
              </span>
            ) : (
              <span className="text-slate-500 dark:text-zinc-400">No ratings yet</span>
            )}
            {brand.productCatalog && brand.productCatalog.length > 0 && (
              <span className="text-slate-500 dark:text-zinc-400">· {brand.productCatalog.length} {brand.productCatalog.length === 1 ? 'product' : 'products'}</span>
            )}
          </div>
        </div>
      </div>
      {isHiddenByUser && (
        <span className="mt-2 inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hidden by current user</span>
      )}
      <div className="mt-3 flex-1">
        {brand.description && <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-600 dark:text-zinc-400">{brand.description}</p>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-zinc-800/60">
        {brand.contaminationReports > 0 ? (
          <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
            <ShieldAlert size={14} /> {brand.contaminationReports} contamination {brand.contaminationReports === 1 ? 'report' : 'reports'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck size={14} /> No contamination reports
          </span>
        )}
        <span className="inline-flex shrink-0 items-center gap-1 text-slate-500 dark:text-zinc-400" title={`Shipping reliability ${brand.shippingReliability}/5`}>
          <Truck size={13} /> {brand.shippingReliability}/5
        </span>
      </div>
    </Link>
  );
}
