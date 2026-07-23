// Side-by-side comparison for substances, brands, and stacks.
//
// Built around what a comparison is actually for: seeing what DIFFERS and
// what's SHARED. Identical facts are muted with a "Same" tag so differences
// carry the visual weight; list data (effects, risks, routes, components)
// is split into shared-vs-unique chip groups instead of two blobs of prose.

import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Hourglass,
  Layers,
  Pill,
  Radio,
  Repeat,
  Scale,
  Search,
  ShieldAlert,
  Timer,
  Truck,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { usePosts } from '../context/PostsContext';
import AccessBadge from '../components/AccessBadge';
import StarRating from '../components/StarRating';
import { cn } from '../lib/utils';
import { getCanonicalCategories } from '../lib/bearings';
import { ADMINISTRATION_META } from '../lib/administrationIcons';
import { TYPE_TAGS, type AdministrationMethod, type Substance, type Brand, type Stack } from '../data/mockData';
import { usePageMeta } from '../hooks/usePageMeta';

/** Administration values keep their emoji as the data key; show the clean label. */
function adminLabel(method: string): string {
  return ADMINISTRATION_META[method as AdministrationMethod]?.label ?? method;
}

type CompareType = 'substance' | 'brand' | 'stack';

const ENTITY_ROUTE: Record<CompareType, string> = {
  substance: '/substance',
  brand: '/brand',
  stack: '/stack',
};

const RISK_STYLES: Record<string, string> = {
  Low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  Moderate: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  High: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
};

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function norm(value: string) {
  return value.trim().toLowerCase();
}

/** Splits two string lists into shared values and per-side uniques. */
function splitShared(a: string[], b: string[]) {
  const bSet = new Set(b.map(norm));
  const aSet = new Set(a.map(norm));
  const seen = new Set<string>();
  const shared: string[] = [];
  const onlyA: string[] = [];
  const onlyB: string[] = [];
  for (const value of a) {
    const key = norm(value);
    if (seen.has(key)) continue;
    seen.add(key);
    (bSet.has(key) ? shared : onlyA).push(value);
  }
  for (const value of b) {
    const key = norm(value);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!aSet.has(key)) onlyB.push(value);
  }
  return { shared, onlyA, onlyB };
}

// --- building blocks --------------------------------------------------------

function SectionCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-zinc-300">
        <Icon size={16} className="text-slate-400 dark:text-zinc-500" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/** One compared fact: label row, then the two values side by side. Identical
 * values are muted with a "Same" tag so the differences carry the weight. */
function FactRow({ label, icon: Icon, a, b, same }: { label: string; icon: LucideIcon; a: ReactNode; b: ReactNode; same?: boolean }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={13} className="text-slate-400 dark:text-zinc-500" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{label}</span>
        {same && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
            Same
          </span>
        )}
      </div>
      <div className={cn('grid grid-cols-2 gap-3 text-sm', same ? 'text-slate-400 dark:text-zinc-500' : 'text-slate-900 dark:text-zinc-100 font-medium')}>
        <div>{a}</div>
        <div>{b}</div>
      </div>
    </div>
  );
}

function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'shared' | 'warn' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        tone === 'shared' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
        tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
        tone === 'neutral' && 'border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300',
      )}
    >
      {children}
    </span>
  );
}

/** Shared chips on top, then per-side unique chips in two columns. */
function OverlapSection({
  title,
  icon,
  a,
  b,
  nameA,
  nameB,
  sharedTone = 'shared',
  renderChip,
}: {
  title: string;
  icon: LucideIcon;
  a: string[];
  b: string[];
  nameA: string;
  nameB: string;
  sharedTone?: 'shared' | 'warn';
  renderChip?: (value: string, tone: 'neutral' | 'shared' | 'warn') => ReactNode;
}) {
  const { shared, onlyA, onlyB } = splitShared(a, b);
  if (shared.length === 0 && onlyA.length === 0 && onlyB.length === 0) return null;
  const chip = renderChip ?? ((value: string, tone: 'neutral' | 'shared' | 'warn') => <Chip key={value} tone={tone}>{value}</Chip>);
  return (
    <SectionCard title={title} icon={icon}>
      {shared.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">Both</p>
          <div className="flex flex-wrap gap-1.5">{shared.map((value) => chip(value, sharedTone))}</div>
        </div>
      )}
      {(onlyA.length > 0 || onlyB.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">Only {nameA}</p>
            <div className="flex flex-wrap gap-1.5">
              {onlyA.length > 0 ? onlyA.map((value) => chip(value, 'neutral')) : <span className="text-xs text-slate-400 dark:text-zinc-600">—</span>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">Only {nameB}</p>
            <div className="flex flex-wrap gap-1.5">
              {onlyB.length > 0 ? onlyB.map((value) => chip(value, 'neutral')) : <span className="text-xs text-slate-400 dark:text-zinc-600">—</span>}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function IdentityCard({ type, item }: { type: CompareType; item: Substance | Brand | Stack }) {
  const substance = type === 'substance' ? (item as Substance) : null;
  const tagLabels = substance
    ? substance.typeTags.slice(0, 2).map((tag) => TYPE_TAGS.find((t) => t.full === tag)?.label).filter((l): l is string => !!l)
    : [];
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center gap-3">
        <span className="relative shrink-0">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-200">
            {initials(item.name)}
          </span>
          {substance && (
            <AccessBadge
              classification={substance.classification}
              className="absolute -bottom-1 -right-1 h-5 w-5 border-2 border-white dark:border-zinc-900"
            />
          )}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-slate-900 dark:text-zinc-100">{item.name}</h2>
          {substance && (
            <p className="truncate text-xs text-slate-500 dark:text-zinc-400">
              {[substance.classification, ...tagLabels].join(' · ')}
            </p>
          )}
          {type === 'stack' && (
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {(item as Stack).substances.length} substances
            </p>
          )}
          {type === 'brand' && (
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
              <StarRating value={(item as Brand).userRating} size={12} />
              {(item as Brand).userRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      {'description' in item && item.description && (
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{item.description}</p>
      )}
      <Link
        to={`${ENTITY_ROUTE[type]}/${item.id}`}
        className="mt-3 inline-flex w-fit items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
      >
        View {type}
        <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}

/** Numeric score where higher wins: the better side is emphasized with the delta. */
function ScorePair({ a, b, format }: { a: number; b: number; format?: (v: number) => ReactNode }) {
  const fmt = format ?? ((v: number) => v.toFixed(1));
  const cell = (own: number, other: number) => {
    const better = own > other;
    return (
      <div className={cn('flex items-center gap-2', better ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-zinc-100')}>
        {fmt(own)}
        {better && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">+{(own - other).toFixed(1)}</span>}
      </div>
    );
  };
  return { a: cell(a, b), b: cell(b, a), same: a === b };
}

// --- picker (no comparison chosen yet) --------------------------------------

const PICKER_TABS: { key: CompareType; label: string; noun: string }[] = [
  { key: 'substance', label: 'Substances', noun: 'substance' },
  { key: 'brand', label: 'Brands', noun: 'brand' },
  { key: 'stack', label: 'Stacks', noun: 'stack' },
];

/** One filled/empty selection slot in the VS hero. */
function PickerSlot({ item, type, placeholder, onClear }: { item: (Substance | Brand | Stack) | undefined; type: CompareType; placeholder: string; onClear: () => void }) {
  if (!item) {
    return (
      <div className="flex h-full min-h-[92px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500">
          <Search size={16} />
        </span>
        <span className="text-sm font-medium text-slate-400 dark:text-zinc-500">{placeholder}</span>
      </div>
    );
  }
  const substance = type === 'substance' ? (item as Substance) : null;
  return (
    <div className="flex h-full min-h-[92px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <span className="relative shrink-0">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-200">
          {initials(item.name)}
        </span>
        {substance && (
          <AccessBadge classification={substance.classification} className="absolute -bottom-1 -right-1 h-5 w-5 border-2 border-white dark:border-zinc-900" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-900 dark:text-zinc-100">{item.name}</p>
        {type === 'brand' && (
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
            <StarRating value={(item as Brand).userRating} size={12} /> {(item as Brand).userRating.toFixed(1)}
          </span>
        )}
        {type === 'stack' && <p className="text-xs text-slate-500 dark:text-zinc-400">{(item as Stack).substances.length} substances</p>}
        {substance && <p className="truncate text-xs text-slate-500 dark:text-zinc-400">{substance.classification}</p>}
      </div>
      <button onClick={onClear} aria-label={`Remove ${item.name}`} className="shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
        <X size={16} />
      </button>
    </div>
  );
}

function ComparePicker({ initialType, initialId }: { initialType: CompareType | null; initialId: string | null }) {
  const navigate = useNavigate();
  const { substances: SUPPLEMENTS, brands: BRANDS, stacks: STACKS } = useCatalog();
  const [tab, setTab] = useState<CompareType>(initialType ?? 'substance');
  const [query, setQuery] = useState('');
  const [pick1, setPick1] = useState<string | null>(initialType ? initialId : null);
  const [pick2, setPick2] = useState<string | null>(null);

  const pool: (Substance | Brand | Stack)[] = tab === 'substance' ? SUPPLEMENTS : tab === 'brand' ? BRANDS : STACKS;
  const byId = (id: string | null) => (id ? pool.find((p) => p.id === id) : undefined);
  const item1 = byId(pick1);
  const item2 = byId(pick2);

  const switchTab = (next: CompareType) => {
    if (next === tab) return;
    setTab(next);
    setPick1(null);
    setPick2(null);
    setQuery('');
  };

  const choose = (id: string) => {
    if (pick1 === id || pick2 === id) return;
    if (!pick1) setPick1(id);
    else if (!pick2) setPick2(id);
    setQuery('');
  };

  const results = useMemo(() => {
    const q = norm(query);
    const candidates = pool
      .filter((p) => p.id !== pick1 && p.id !== pick2)
      .filter((p) => !q || norm(p.name).includes(q) || ('aliases' in p && (p.aliases ?? []).some((a) => norm(a).includes(q))));
    // Once the first item is picked, surface the most sensible second picks
    // first: substances rank by known pairings + category overlap, brands by
    // how many associated substances they share. Stacks keep catalog order.
    const first = tab === 'substance' && pick1 ? (pool.find((p) => p.id === pick1) as Substance | undefined) : undefined;
    if (first) {
      const firstCategories = new Set(getCanonicalCategories(first.paths.map((path) => path.category)));
      const relevance = (p: Substance) => {
        let score = 0;
        if (first.possiblePairings.some((n) => norm(n) === norm(p.name))) score += 4;
        if (p.possiblePairings.some((n) => norm(n) === norm(first.name))) score += 4;
        score += getCanonicalCategories(p.paths.map((path) => path.category)).filter((c) => firstCategories.has(c)).length;
        return score;
      };
      const scored = new Map(candidates.map((p) => [p.id, relevance(p as Substance)]));
      candidates.sort((a, b) => (scored.get(b.id) ?? 0) - (scored.get(a.id) ?? 0));
    }
    const firstBrand = tab === 'brand' && pick1 ? (pool.find((p) => p.id === pick1) as Brand | undefined) : undefined;
    if (firstBrand) {
      const firstProducts = new Set((firstBrand.products ?? []).map((n) => norm(n)));
      const scored = new Map(
        candidates.map((p) => [
          p.id,
          ((p as Brand).products ?? []).filter((n) => firstProducts.has(norm(n))).length,
        ]),
      );
      candidates.sort((a, b) => (scored.get(b.id) ?? 0) - (scored.get(a.id) ?? 0));
    }
    return candidates.slice(0, 8);
  }, [pool, tab, query, pick1, pick2]);

  const ready = pick1 && pick2;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 text-center">
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/20">
          <Scale size={24} />
        </span>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Compare side by side</h1>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500 dark:text-zinc-400">
          Pick two to see what differs and what they share — doses, effects, risks, and community activity.
        </p>
      </div>

      {/* Type tabs */}
      <div className="mb-5 flex justify-center">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1 dark:border-zinc-800 dark:bg-zinc-900/70">
          {PICKER_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
                tab === t.key
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* VS hero with the two slots */}
      <div className="relative mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
        <PickerSlot item={item1} type={tab} placeholder={`Choose a ${PICKER_TABS.find((t) => t.key === tab)!.noun}`} onClear={() => setPick1(null)} />
        <PickerSlot item={item2} type={tab} placeholder={`Choose a ${PICKER_TABS.find((t) => t.key === tab)!.noun}`} onClear={() => setPick2(null)} />
        <span className="absolute left-1/2 top-1/2 hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-emerald-500 to-emerald-700 text-[11px] font-black text-white shadow-lg dark:border-zinc-950 sm:flex">
          VS
        </span>
      </div>

      {ready ? (
        <button
          onClick={() => navigate(`/compare?type=${tab}&id1=${pick1}&id2=${pick2}`)}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white shadow-sm transition-colors hover:bg-emerald-600 dark:text-zinc-950 dark:hover:bg-emerald-400"
        >
          Compare {item1!.name} vs {item2!.name}
          <ArrowRight size={18} />
        </button>
      ) : (
        <div className="mb-6">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${PICKER_TABS.find((t) => t.key === tab)!.label.toLowerCase()}…`}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
            {results.length > 0 ? (
              results.map((p) => {
                const substance = tab === 'substance' ? (p as Substance) : null;
                return (
                  <button
                    key={p.id}
                    onClick={() => choose(p.id)}
                    className="flex w-full items-center gap-3 border-b border-slate-100 bg-white px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-200">
                      {initials(p.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">{p.name}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-zinc-400">
                        {substance
                          ? substance.classification
                          : tab === 'brand'
                            ? `${(p as Brand).userRating.toFixed(1)} ★`
                            : `${(p as Stack).substances.length} substances`}
                      </span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-slate-300 dark:text-zinc-600" />
                  </button>
                );
              })
            ) : (
              <p className="bg-white px-4 py-6 text-center text-sm text-slate-400 dark:bg-zinc-900/50 dark:text-zinc-500">No matches.</p>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-slate-400 dark:text-zinc-500">
            {pick1 ? 'Pick one more to compare.' : 'Pick two to compare.'}
          </p>
        </div>
      )}
    </div>
  );
}

// --- page -------------------------------------------------------------------

export default function Compare() {
  usePageMeta('Compare', 'Side-by-side comparison of substances, brands, and stacks.');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { substances: SUPPLEMENTS, brands: BRANDS, stacks: STACKS } = useCatalog();
  const { posts: allPosts } = usePosts();
  const type = searchParams.get('type') as CompareType | null;
  const id1 = searchParams.get('id1');
  const id2 = searchParams.get('id2');

  const [item1, item2] = useMemo<[Substance | Brand | Stack | undefined, Substance | Brand | Stack | undefined]>(() => {
    if (type === 'substance') return [SUPPLEMENTS.find((s) => s.id === id1), SUPPLEMENTS.find((s) => s.id === id2)];
    if (type === 'stack') return [STACKS.find((s) => s.id === id1), STACKS.find((s) => s.id === id2)];
    if (type === 'brand') return [BRANDS.find((b) => b.id === id1), BRANDS.find((b) => b.id === id2)];
    return [undefined, undefined];
  }, [type, id1, id2, SUPPLEMENTS, STACKS, BRANDS]);

  if (!type || !id1 || !id2) {
    return <ComparePicker initialType={type} initialId={id1} />;
  }
  if (!item1 || !item2) {
    return <div className="p-8 text-center text-slate-500 dark:text-zinc-400">Loading comparison…</div>;
  }

  const postsFor = (id: string) => {
    const key = type === 'substance' ? 'supplementId' : type === 'brand' ? 'brandId' : 'stackId';
    return allPosts.filter((p) => p[key] === id);
  };
  const posts1 = postsFor(item1.id);
  const posts2 = postsFor(item2.id);
  const pulse = (posts: typeof allPosts) => {
    const dispatches = posts.filter((p) => p.type === 'Dispatch').length;
    const signals = posts.filter((p) => p.type === 'Signal').length;
    if (dispatches === 0 && signals === 0) return <span className="text-slate-400 dark:text-zinc-500">No posts yet</span>;
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1"><Pill size={13} className="text-emerald-500" /> {dispatches} {dispatches === 1 ? 'Dispatch' : 'Dispatches'}</span>
        <span className="inline-flex items-center gap-1"><Radio size={13} className="text-blue-500" /> {signals} {signals === 1 ? 'Signal' : 'Signals'}</span>
      </span>
    );
  };

  const s1 = type === 'substance' ? (item1 as Substance) : null;
  const s2 = type === 'substance' ? (item2 as Substance) : null;
  const b1 = type === 'brand' ? (item1 as Brand) : null;
  const b2 = type === 'brand' ? (item2 as Brand) : null;
  const k1 = type === 'stack' ? (item1 as Stack) : null;
  const k2 = type === 'stack' ? (item2 as Stack) : null;

  const riskPill = (risk: Substance['riskLevel']) =>
    risk ? (
      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', RISK_STYLES[risk])}>{risk}</span>
    ) : (
      <span className="text-slate-400 dark:text-zinc-500">Not assessed</span>
    );

  const substanceChip = (value: string, tone: 'neutral' | 'shared' | 'warn') => {
    const match = SUPPLEMENTS.find((s) => norm(s.name) === norm(value));
    if (!match) return <Chip key={value} tone={tone}>{value}</Chip>;
    return (
      <Link key={value} to={`/substance/${match.id}`} className="transition-opacity hover:opacity-75">
        <Chip tone={tone}>
          <AccessBadge classification={match.classification} className="mr-1.5 h-3.5 w-3.5 text-[8px]" />
          {value}
        </Chip>
      </Link>
    );
  };

  const brandRating = b1 && b2 ? ScorePair({ a: b1.userRating, b: b2.userRating }) : null;
  const brandShipping = b1 && b2 ? ScorePair({ a: b1.shippingReliability, b: b2.shippingReliability }) : null;

  const brandSubstances = (brand: Brand) => {
    const ids = new Set<string>([...(brand.products ?? []), ...((brand.productCatalog ?? []).map((p) => p.substanceId).filter((x): x is string => !!x))]);
    return [...ids].map((id) => SUPPLEMENTS.find((s) => s.id === id)?.name).filter((n): n is string => !!n);
  };
  const brandLabels = (brand: Brand) => [...new Set((brand.productCatalog ?? []).flatMap((p) => p.healthLabels ?? []))];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* VS hero */}
      <div className="relative mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
        <IdentityCard type={type} item={item1} />
        <IdentityCard type={type} item={item2} />
        <span className="absolute left-1/2 top-1/2 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-black text-white shadow-lg dark:border-zinc-950 sm:flex">
          VS
        </span>
      </div>

      {/* Sticky column key: keeps each column's identity in view once the
          hero cards scroll away, so long comparisons stay readable. */}
      <div className="sticky top-16 z-30 mb-4 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 md:top-20">
        <div className="grid grid-cols-2 gap-3">
          {[item1, item2].map((item) => (
            <div key={item.id} className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-200">
                {initials(item.name)}
              </span>
              <span className="truncate text-sm font-bold text-slate-900 dark:text-zinc-100">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* Substance: key facts + set overlaps */}
        {s1 && s2 && (
          <>
            <SectionCard title="Key facts" icon={Activity}>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                <FactRow
                  label="Reported dose range"
                  icon={Pill}
                  a={s1.averageDosage || '—'}
                  b={s2.averageDosage || '—'}
                  same={norm(s1.averageDosage) === norm(s2.averageDosage) && !!s1.averageDosage}
                />
                <FactRow
                  label="Length of cycle"
                  icon={Repeat}
                  a={s1.lengthOfCycle || '—'}
                  b={s2.lengthOfCycle || '—'}
                  same={norm(s1.lengthOfCycle) === norm(s2.lengthOfCycle) && !!s1.lengthOfCycle}
                />
                <FactRow
                  label="Tolerance buildup"
                  icon={Timer}
                  a={s1.toleranceBuildup || '—'}
                  b={s2.toleranceBuildup || '—'}
                  same={norm(s1.toleranceBuildup) === norm(s2.toleranceBuildup) && !!s1.toleranceBuildup}
                />
                <FactRow
                  label="Risk level"
                  icon={ShieldAlert}
                  a={riskPill(s1.riskLevel)}
                  b={riskPill(s2.riskLevel)}
                  same={!!s1.riskLevel && s1.riskLevel === s2.riskLevel}
                />
                {(s1.halfLife || s2.halfLife) && (
                  <FactRow
                    label="Half-life"
                    icon={Hourglass}
                    a={s1.halfLife || '—'}
                    b={s2.halfLife || '—'}
                    same={!!s1.halfLife && norm(s1.halfLife) === norm(s2.halfLife ?? '')}
                  />
                )}
                <FactRow label="Community activity" icon={Radio} a={pulse(posts1)} b={pulse(posts2)} />
              </div>
            </SectionCard>

            <OverlapSection title="Subjective effects" icon={Activity} a={s1.subjectiveEffects} b={s2.subjectiveEffects} nameA={s1.name} nameB={s2.name} />
            <OverlapSection title="Health risks" icon={AlertTriangle} a={s1.healthRisks} b={s2.healthRisks} nameA={s1.name} nameB={s2.name} sharedTone="warn" />
            <OverlapSection title="Administration" icon={Pill} a={s1.administration.map(adminLabel)} b={s2.administration.map(adminLabel)} nameA={s1.name} nameB={s2.name} />
            <OverlapSection
              title="Categories"
              icon={Layers}
              a={s1.paths.map((p) => p.category)}
              b={s2.paths.map((p) => p.category)}
              nameA={s1.name}
              nameB={s2.name}
            />
          </>
        )}

        {/* Brand: scored facts + overlap */}
        {b1 && b2 && brandRating && brandShipping && (
          <>
            <SectionCard title="Scores" icon={Activity}>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                <FactRow
                  label="User rating"
                  icon={Activity}
                  a={<span className="flex items-center gap-2"><StarRating value={b1.userRating} size={14} />{brandRating.a}</span>}
                  b={<span className="flex items-center gap-2"><StarRating value={b2.userRating} size={14} />{brandRating.b}</span>}
                  same={brandRating.same}
                />
                <FactRow
                  label="Shipping reliability"
                  icon={Truck}
                  a={brandShipping.a}
                  b={brandShipping.b}
                  same={brandShipping.same}
                />
                <FactRow
                  label="Contamination reports"
                  icon={AlertTriangle}
                  a={b1.contaminationReports === 0
                    ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={15} /> None reported</span>
                    : <span className="inline-flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400"><AlertTriangle size={15} /> {b1.contaminationReports}</span>}
                  b={b2.contaminationReports === 0
                    ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={15} /> None reported</span>
                    : <span className="inline-flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400"><AlertTriangle size={15} /> {b2.contaminationReports}</span>}
                  same={b1.contaminationReports === b2.contaminationReports}
                />
                <FactRow
                  label="Third-party tested"
                  icon={CheckCircle2}
                  a={b1.thirdPartyTestingLinks.length > 0
                    ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={15} /> Yes · {b1.thirdPartyTestingLinks.length} {b1.thirdPartyTestingLinks.length === 1 ? 'report' : 'reports'}</span>
                    : <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-zinc-400"><XCircle size={15} /> None on file</span>}
                  b={b2.thirdPartyTestingLinks.length > 0
                    ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={15} /> Yes · {b2.thirdPartyTestingLinks.length} {b2.thirdPartyTestingLinks.length === 1 ? 'report' : 'reports'}</span>
                    : <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-zinc-400"><XCircle size={15} /> None on file</span>}
                  same={(b1.thirdPartyTestingLinks.length > 0) === (b2.thirdPartyTestingLinks.length > 0)}
                />
                <FactRow label="Community activity" icon={Radio} a={pulse(posts1)} b={pulse(posts2)} />
              </div>
            </SectionCard>

            <OverlapSection
              title="Substances carried"
              icon={Pill}
              a={brandSubstances(b1)}
              b={brandSubstances(b2)}
              nameA={b1.name}
              nameB={b2.name}
              renderChip={substanceChip}
            />
            <OverlapSection title="Health labels" icon={CheckCircle2} a={brandLabels(b1)} b={brandLabels(b2)} nameA={b1.name} nameB={b2.name} />
          </>
        )}

        {/* Stack: component overlap is the whole story */}
        {k1 && k2 && (
          <>
            <OverlapSection
              title="Components"
              icon={Layers}
              a={k1.substances.map((s) => s.name)}
              b={k2.substances.map((s) => s.name)}
              nameA={k1.name}
              nameB={k2.name}
              renderChip={substanceChip}
            />
            <SectionCard title="Key facts" icon={Activity}>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                <FactRow
                  label="Substance count"
                  icon={Layers}
                  a={`${k1.substances.length} substances`}
                  b={`${k2.substances.length} substances`}
                  same={k1.substances.length === k2.substances.length}
                />
                <FactRow label="Community activity" icon={Radio} a={pulse(posts1)} b={pulse(posts2)} />
              </div>
            </SectionCard>
            {(k1.markers?.length || k2.markers?.length) ? (
              <OverlapSection title="Common reasons" icon={Activity} a={k1.markers ?? []} b={k2.markers ?? []} nameA={k1.name} nameB={k2.name} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
