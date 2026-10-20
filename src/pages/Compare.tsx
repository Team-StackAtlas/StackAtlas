// Side-by-side comparison for substances, brands, and stacks — two or three
// at a time.
//
// Built around what a comparison is actually for: seeing what DIFFERS and
// what's SHARED. Identical facts are muted with a "Same" tag so differences
// carry the visual weight; list data (effects, risks, routes, components)
// is split into shared-vs-unique chip groups instead of blobs of prose.

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
  Pencil,
  Pill,
  Plus,
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
import { ADMINISTRATION_META } from '../lib/administrationIcons';
import { rankCandidates, type CompareType, type CompareItem } from '../lib/compareSimilarity';
import { TYPE_TAGS, type AdministrationMethod, type Substance, type Brand, type Stack } from '../data/mockData';
import { usePageMeta } from '../hooks/usePageMeta';

/** Up to three things side by side; more than that stops being a comparison. */
const MAX_ITEMS = 3;

/** Administration values keep their emoji as the data key; show the clean label. */
function adminLabel(method: string): string {
  return ADMINISTRATION_META[method as AdministrationMethod]?.label ?? method;
}

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

/** Column layout for n compared items (1 column stacked on phones). */
function columnsClass(n: number) {
  return n >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
}

/** All string values equal (after trimming/casing), and non-empty. */
function allSame(values: string[]) {
  const first = norm(values[0] ?? '');
  return !!first && values.every((v) => norm(v) === first);
}

/**
 * Splits n string lists into values shared by ALL, values shared by SOME
 * (two of three), and values unique to one item.
 */
function splitOverlap(lists: string[][]) {
  const n = lists.length;
  const seen = new Map<string, { value: string; owners: number[] }>();
  lists.forEach((list, idx) => {
    for (const value of list) {
      const key = norm(value);
      if (!key) continue;
      const entry = seen.get(key) ?? { value, owners: [] };
      if (!entry.owners.includes(idx)) entry.owners.push(idx);
      seen.set(key, entry);
    }
  });
  const all: string[] = [];
  const some: { value: string; owners: number[] }[] = [];
  const only: string[][] = lists.map(() => []);
  for (const entry of seen.values()) {
    if (entry.owners.length === n) all.push(entry.value);
    else if (entry.owners.length === 1) only[entry.owners[0]].push(entry.value);
    else some.push(entry);
  }
  return { all, some, only };
}

// --- building blocks --------------------------------------------------------

function SectionCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-zinc-300">
        <Icon size={16} className="text-slate-500 dark:text-zinc-400" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/** One compared fact: label row, then one value per compared item. Identical
 * values are muted with a "Same" tag so the differences carry the weight. */
function FactRow({ label, icon: Icon, values, same }: { label: string; icon: LucideIcon; values: ReactNode[]; same?: boolean }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={13} className="text-slate-500 dark:text-zinc-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{label}</span>
        {same && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
            Same
          </span>
        )}
      </div>
      <div
        className={cn('grid gap-3 text-sm', same ? 'text-slate-500 dark:text-zinc-400' : 'text-slate-900 dark:text-zinc-100 font-medium')}
        style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}
      >
        {values.map((value, i) => (
          <div key={i}>{value}</div>
        ))}
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

type ChipRenderer = (value: string, tone: 'neutral' | 'shared' | 'warn') => ReactNode;

/** Shared chips on top (all, then some), then per-item unique chips in columns. */
function OverlapSection({
  title,
  icon,
  lists,
  names,
  sharedTone = 'shared',
  renderChip,
}: {
  title: string;
  icon: LucideIcon;
  lists: string[][];
  names: string[];
  sharedTone?: 'shared' | 'warn';
  renderChip?: ChipRenderer;
}) {
  const { all, some, only } = splitOverlap(lists);
  if (all.length === 0 && some.length === 0 && only.every((o) => o.length === 0)) return null;
  const chip: ChipRenderer = renderChip ?? ((value, tone) => <Chip key={value} tone={tone}>{value}</Chip>);
  return (
    <SectionCard title={title} icon={icon}>
      {all.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">{names.length > 2 ? 'All three' : 'Both'}</p>
          <div className="flex flex-wrap gap-1.5">{all.map((value) => chip(value, sharedTone))}</div>
        </div>
      )}
      {some.length > 0 && (
        <div className="mb-4 space-y-3">
          {some.map(({ value, owners }) => (
            <div key={value} className="flex flex-wrap items-center gap-2">
              {chip(value, sharedTone)}
              <span className="text-xs text-slate-500 dark:text-zinc-400">{owners.map((i) => names[i]).join(' & ')}</span>
            </div>
          ))}
        </div>
      )}
      {only.some((o) => o.length > 0) && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${names.length}, minmax(0, 1fr))` }}>
          {only.map((values, i) => (
            <div key={names[i]}>
              <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">Only {names[i]}</p>
              <div className="flex flex-wrap gap-1.5">
                {values.length > 0 ? values.map((value) => chip(value, 'neutral')) : <span className="text-xs text-slate-500 dark:text-zinc-600">—</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function IdentityCard({ type, item, onChange }: { type: CompareType; item: CompareItem; onChange?: () => void }) {
  const substance = type === 'substance' ? (item as Substance) : null;
  const tagLabels = substance
    ? substance.typeTags.slice(0, 2).map((tag) => TYPE_TAGS.find((t) => t.full === tag)?.label).filter((l): l is string => !!l)
    : [];
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-start gap-3">
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
        <div className="min-w-0 flex-1">
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
        {onChange && (
          <button
            type="button"
            onClick={onChange}
            aria-label={`Change ${item.name}`}
            title="Change"
            className="shrink-0 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <Pencil size={15} />
          </button>
        )}
      </div>
      {'description' in item && item.description && (
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{item.description}</p>
      )}
      <Link
        to={`${ENTITY_ROUTE[type]}/${item.id}`}
        className="mt-3 inline-flex w-fit items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
      >
        View {type}
        <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}

/** Numeric scores where higher wins: the single best is emphasized with its
 * lead over the runner-up; ties produce no winner. */
function scoreCells(values: number[], format?: (v: number) => ReactNode) {
  const fmt = format ?? ((v: number) => v.toFixed(1));
  const max = Math.max(...values);
  const winners = values.filter((v) => v === max).length;
  const runnerUp = Math.max(...values.filter((v) => v !== max), Number.NEGATIVE_INFINITY);
  const cells = values.map((own, i) => {
    const best = winners === 1 && own === max;
    return (
      <div key={i} className={cn('flex items-center gap-2', best ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-zinc-100')}>
        {fmt(own)}
        {best && Number.isFinite(runnerUp) && (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            +{(own - runnerUp).toFixed(1)}
          </span>
        )}
      </div>
    );
  });
  return { cells, same: winners === values.length };
}

// --- picker (fewer than two things chosen) ----------------------------------

const PICKER_TABS: { key: CompareType; label: string; noun: string }[] = [
  { key: 'substance', label: 'Substances', noun: 'substance' },
  { key: 'brand', label: 'Brands', noun: 'brand' },
  { key: 'stack', label: 'Stacks', noun: 'stack' },
];

/** Slot copy: the first pick is the subject; everything after is "compare it to". */
function slotPlaceholder(index: number, noun: string) {
  if (index === 0) return `First ${noun} to compare`;
  if (index === 1) return 'Compare it to…';
  return 'Add a third (optional)';
}

/** One filled/empty selection slot in the VS hero. */
function PickerSlot({ item, type, placeholder, onClear, optional }: { item: CompareItem | undefined; type: CompareType; placeholder: string; onClear: () => void; optional?: boolean }) {
  if (!item) {
    return (
      <div className={cn('flex h-full min-h-[92px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-4 text-center', optional ? 'border-slate-200/70 bg-transparent dark:border-zinc-800/70' : 'border-slate-200 bg-slate-50/60 dark:border-zinc-800 dark:bg-zinc-900/40')}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
          {optional ? <Plus size={16} /> : <Search size={16} />}
        </span>
        <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">{placeholder}</span>
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
      <button onClick={onClear} aria-label={`Remove ${item.name}`} className="shrink-0 rounded-full p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
        <X size={16} />
      </button>
    </div>
  );
}

function ComparePicker({ initialType, initialIds }: { initialType: CompareType | null; initialIds: string[] }) {
  const navigate = useNavigate();
  const { substances: SUPPLEMENTS, brands: BRANDS, stacks: STACKS } = useCatalog();
  const [tab, setTab] = useState<CompareType>(initialType ?? 'substance');
  const [query, setQuery] = useState('');
  const [picks, setPicks] = useState<string[]>(initialType ? initialIds.slice(0, MAX_ITEMS) : []);
  // Search-first: the catalog list stays hidden until there is a query, a
  // first pick to suggest partners for, or the person asks to browse.
  const [browsing, setBrowsing] = useState(false);

  const noun = PICKER_TABS.find((t) => t.key === tab)!.noun;
  const pool: CompareItem[] = tab === 'substance' ? SUPPLEMENTS : tab === 'brand' ? BRANDS : STACKS;
  const picked = picks.map((id) => pool.find((p) => p.id === id)).filter((p): p is CompareItem => !!p);

  const switchTab = (next: CompareType) => {
    if (next === tab) return;
    setTab(next);
    setPicks([]);
    setQuery('');
    setBrowsing(false);
  };

  const choose = (id: string) => {
    if (picks.includes(id) || picks.length >= MAX_ITEMS) return;
    setPicks((prev) => [...prev, id]);
    setQuery('');
    setBrowsing(false);
  };

  const removeAt = (index: number) => setPicks((prev) => prev.filter((_, i) => i !== index));

  const showList = query.trim().length > 0 || browsing || picked.length > 0;
  const results = useMemo(() => {
    const q = norm(query);
    const candidates = pool
      .filter((p) => !picks.includes(p.id))
      .filter((p) => !q || norm(p.name).includes(q) || ('aliases' in p && (p.aliases ?? []).some((a) => norm(a).includes(q))));
    const ranked = rankCandidates(tab, picked, candidates);
    // Suggestions (no query, something picked) stay short; browsing or searching shows everything.
    return !q && !browsing && picked.length > 0 ? ranked.slice(0, 8) : ranked;
  }, [pool, tab, query, picks, picked, browsing]);

  const ready = picks.length >= 2;
  const slotCount = picks.length >= 2 ? MAX_ITEMS : 2;
  const goCompare = () => navigate(`/compare?type=${tab}&${picks.map((id, i) => `id${i + 1}=${id}`).join('&')}`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 text-center">
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/20">
          <Scale size={24} />
        </span>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Compare side by side</h1>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500 dark:text-zinc-400">
          Pick a {noun}, then what to compare it to — two or three at a time. See what differs and what they share.
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

      {/* Hero slots */}
      <div className={cn('relative mb-5 grid grid-cols-1 gap-3 sm:gap-6', columnsClass(slotCount))}>
        {Array.from({ length: slotCount }, (_, i) => (
          <PickerSlot
            key={i}
            item={picked[i]}
            type={tab}
            placeholder={slotPlaceholder(i, noun)}
            optional={i === 2}
            onClear={() => removeAt(i)}
          />
        ))}
        {slotCount === 2 && (
          <span className="absolute left-1/2 top-1/2 hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-emerald-500 to-emerald-700 text-[11px] font-black text-white shadow-lg dark:border-zinc-950 sm:flex">
            VS
          </span>
        )}
      </div>

      {ready && (
        <button
          onClick={goCompare}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white shadow-sm transition-colors hover:bg-emerald-800 dark:text-zinc-950 dark:hover:bg-emerald-400"
        >
          Compare {picked.map((p) => p.name).join(' vs ')}
          <ArrowRight size={18} />
        </button>
      )}

      {picks.length < MAX_ITEMS && (
        <div className="mb-6">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={picked.length === 0 ? `Search ${PICKER_TABS.find((t) => t.key === tab)!.label.toLowerCase()}…` : picked.length === 1 ? `Compare ${picked[0].name} to…` : 'Add a third (optional)…'}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>

          {!showList ? (
            <button
              type="button"
              onClick={() => setBrowsing(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/50"
            >
              Browse all {PICKER_TABS.find((t) => t.key === tab)!.label.toLowerCase()}
              <ArrowRight size={15} />
            </button>
          ) : (
            <>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  {query ? `${results.length} ${results.length === 1 ? 'match' : 'matches'}` : picked.length > 0 && !browsing ? `Suggested for ${picked.map((p) => p.name).join(' & ')}` : `All ${PICKER_TABS.find((t) => t.key === tab)!.label.toLowerCase()}`}
                </p>
                {!query && picked.length > 0 && !browsing && (
                  <button type="button" onClick={() => setBrowsing(true)} className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                    Browse all
                  </button>
                )}
              </div>
              <div className="mt-2 max-h-[28rem] overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800">
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
                  <p className="bg-white px-4 py-6 text-center text-sm text-slate-500 dark:bg-zinc-900/50 dark:text-zinc-400">No matches.</p>
                )}
              </div>
            </>
          )}
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-zinc-400">
            {picked.length === 0 ? `Start with the ${noun} you want to compare.` : picked.length === 1 ? 'Now pick what to compare it to.' : 'Add a third, or compare these two.'}
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
  const ids = useMemo(
    () => [searchParams.get('id1'), searchParams.get('id2'), searchParams.get('id3')].filter((id): id is string => !!id).slice(0, MAX_ITEMS),
    [searchParams],
  );
  // ?edit=1 reopens the picker with the current picks kept, so "change this
  // one" or "add a third" never means starting over.
  const editing = searchParams.get('edit') === '1';

  const items = useMemo<(CompareItem | undefined)[]>(() => {
    const pool: CompareItem[] = type === 'substance' ? SUPPLEMENTS : type === 'brand' ? BRANDS : type === 'stack' ? STACKS : [];
    return ids.map((id) => pool.find((p) => p.id === id));
  }, [type, ids, SUPPLEMENTS, STACKS, BRANDS]);

  if (!type || ids.length < 2 || editing) {
    return <ComparePicker initialType={type} initialIds={ids} />;
  }
  if (items.some((item) => !item)) {
    return <div className="p-8 text-center text-slate-500 dark:text-zinc-400">Loading comparison…</div>;
  }
  const resolved = items as CompareItem[];
  const names = resolved.map((item) => item.name);
  const n = resolved.length;

  const reopenWith = (keepIds: string[]) =>
    navigate(`/compare?type=${type}&${keepIds.map((id, i) => `id${i + 1}=${id}`).join('&')}&edit=1`);
  const changeAt = (index: number) => reopenWith(ids.filter((_, i) => i !== index));
  const addThird = () => reopenWith(ids);

  const postsFor = (id: string) => {
    const key = type === 'substance' ? 'supplementId' : type === 'brand' ? 'brandId' : 'stackId';
    return allPosts.filter((p) => p[key] === id);
  };
  const pulse = (posts: typeof allPosts) => {
    const dispatches = posts.filter((p) => p.type === 'Dispatch').length;
    const signals = posts.filter((p) => p.type === 'Signal').length;
    if (dispatches === 0 && signals === 0) return <span className="text-slate-500 dark:text-zinc-400">No posts yet</span>;
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1"><Pill size={13} className="text-emerald-500" /> {dispatches} {dispatches === 1 ? 'Dispatch' : 'Dispatches'}</span>
        <span className="inline-flex items-center gap-1"><Radio size={13} className="text-blue-500" /> {signals} {signals === 1 ? 'Signal' : 'Signals'}</span>
      </span>
    );
  };
  const communityRow = <FactRow label="Community activity" icon={Radio} values={resolved.map((item) => pulse(postsFor(item.id)))} />;

  const substances = type === 'substance' ? (resolved as Substance[]) : null;
  const brands = type === 'brand' ? (resolved as Brand[]) : null;
  const stacks = type === 'stack' ? (resolved as Stack[]) : null;

  const riskPill = (risk: Substance['riskLevel']) =>
    risk ? (
      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', RISK_STYLES[risk])}>{risk}</span>
    ) : (
      <span className="text-slate-500 dark:text-zinc-400">Not assessed</span>
    );

  const substanceChip: ChipRenderer = (value, tone) => {
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

  /** Text fact across all items: values with "—" fallbacks and a shared Same flag. */
  const textFact = (label: string, icon: LucideIcon, pick: (s: Substance) => string | undefined) => {
    const values = substances!.map((s) => pick(s) ?? '');
    return <FactRow label={label} icon={icon} values={values.map((v) => v || '—')} same={allSame(values)} />;
  };

  const brandSubstances = (brand: Brand) => {
    const bid = new Set<string>([...(brand.products ?? []), ...((brand.productCatalog ?? []).map((p) => p.substanceId).filter((x): x is string => !!x))]);
    return [...bid].map((id) => SUPPLEMENTS.find((s) => s.id === id)?.name).filter((x): x is string => !!x);
  };
  const brandLabels = (brand: Brand) => [...new Set((brand.productCatalog ?? []).flatMap((p) => p.healthLabels ?? []))];

  const rating = brands ? scoreCells(brands.map((b) => b.userRating)) : null;
  const shipping = brands ? scoreCells(brands.map((b) => b.shippingReliability)) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {n < MAX_ITEMS && (
          <button
            onClick={addThird}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Plus size={15} /> Add a third
          </button>
        )}
      </div>

      {/* Hero */}
      <div className={cn('relative mb-4 grid grid-cols-1 gap-3 sm:gap-6', columnsClass(n))}>
        {resolved.map((item, i) => (
          <IdentityCard key={item.id} type={type} item={item} onChange={() => changeAt(i)} />
        ))}
        {n === 2 && (
          <span className="absolute left-1/2 top-1/2 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-black text-white shadow-lg dark:border-zinc-950 sm:flex">
            VS
          </span>
        )}
      </div>

      {/* Sticky column key: keeps each column's identity in view once the
          hero cards scroll away, so long comparisons stay readable. */}
      <div className="sticky top-16 z-30 mb-4 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 md:top-20">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {resolved.map((item) => (
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
        {substances && (
          <>
            <SectionCard title="Key facts" icon={Activity}>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {textFact('Reported dose range', Pill, (s) => s.averageDosage)}
                {textFact('Length of cycle', Repeat, (s) => s.lengthOfCycle)}
                {textFact('Tolerance buildup', Timer, (s) => s.toleranceBuildup)}
                <FactRow
                  label="Risk level"
                  icon={ShieldAlert}
                  values={substances.map((s) => riskPill(s.riskLevel))}
                  same={!!substances[0].riskLevel && substances.every((s) => s.riskLevel === substances[0].riskLevel)}
                />
                {substances.some((s) => s.halfLife) && textFact('Half-life', Hourglass, (s) => s.halfLife)}
                {communityRow}
              </div>
            </SectionCard>

            <OverlapSection title="Subjective effects" icon={Activity} lists={substances.map((s) => s.subjectiveEffects)} names={names} />
            <OverlapSection title="Health risks" icon={AlertTriangle} lists={substances.map((s) => s.healthRisks)} names={names} sharedTone="warn" />
            <OverlapSection title="Administration" icon={Pill} lists={substances.map((s) => s.administration.map(adminLabel))} names={names} />
            <OverlapSection title="Categories" icon={Layers} lists={substances.map((s) => s.paths.map((p) => p.category))} names={names} />
          </>
        )}

        {/* Brand: scored facts + overlap */}
        {brands && rating && shipping && (
          <>
            <SectionCard title="Scores" icon={Activity}>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                <FactRow
                  label="User rating"
                  icon={Activity}
                  values={brands.map((b, i) => (
                    <span key={b.id} className="flex items-center gap-2"><StarRating value={b.userRating} size={14} />{rating.cells[i]}</span>
                  ))}
                  same={rating.same}
                />
                <FactRow label="Shipping reliability" icon={Truck} values={shipping.cells} same={shipping.same} />
                <FactRow
                  label="Contamination reports"
                  icon={AlertTriangle}
                  values={brands.map((b) =>
                    b.contaminationReports === 0
                      ? <span key={b.id} className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={15} /> None reported</span>
                      : <span key={b.id} className="inline-flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400"><AlertTriangle size={15} /> {b.contaminationReports}</span>,
                  )}
                  same={brands.every((b) => b.contaminationReports === brands[0].contaminationReports)}
                />
                <FactRow
                  label="Third-party tested"
                  icon={CheckCircle2}
                  values={brands.map((b) =>
                    b.thirdPartyTestingLinks.length > 0
                      ? <span key={b.id} className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={15} /> Yes · {b.thirdPartyTestingLinks.length} {b.thirdPartyTestingLinks.length === 1 ? 'report' : 'reports'}</span>
                      : <span key={b.id} className="inline-flex items-center gap-1.5 text-slate-500 dark:text-zinc-400"><XCircle size={15} /> None on file</span>,
                  )}
                  same={brands.every((b) => (b.thirdPartyTestingLinks.length > 0) === (brands[0].thirdPartyTestingLinks.length > 0))}
                />
                {communityRow}
              </div>
            </SectionCard>

            <OverlapSection title="Substances carried" icon={Pill} lists={brands.map(brandSubstances)} names={names} renderChip={substanceChip} />
            <OverlapSection title="Health labels" icon={CheckCircle2} lists={brands.map(brandLabels)} names={names} />
          </>
        )}

        {/* Stack: component overlap is the whole story */}
        {stacks && (
          <>
            <OverlapSection title="Components" icon={Layers} lists={stacks.map((k) => k.substances.map((s) => s.name))} names={names} renderChip={substanceChip} />
            <SectionCard title="Key facts" icon={Activity}>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                <FactRow
                  label="Substance count"
                  icon={Layers}
                  values={stacks.map((k) => `${k.substances.length} substances`)}
                  same={stacks.every((k) => k.substances.length === stacks[0].substances.length)}
                />
                {communityRow}
              </div>
            </SectionCard>
            {stacks.some((k) => k.markers?.length) ? (
              <OverlapSection title="Common reasons" icon={Activity} lists={stacks.map((k) => k.markers ?? [])} names={names} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
