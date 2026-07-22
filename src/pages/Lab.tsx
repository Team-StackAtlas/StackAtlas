import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, GitCompare, Layers, Search, SearchX, Star, Truck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCatalog } from '../context/CatalogContext';
import { Modal } from '../components/ui/Modal';
import { CompareModal } from '../components/CompareModal';
import AccessBadge from '../components/AccessBadge';
import StarRating from '../components/StarRating';
import { TYPE_TAGS, type Substance, type Brand, type Stack } from '../data/mockData';

type CompareType = 'substance' | 'brand' | 'stack';
type PickerItem = Substance | Brand | Stack;

/** First-letter avatar initial. */
function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

const AVATAR_STYLES: Record<CompareType, string> = {
  substance: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300',
  brand: 'bg-indigo-500 text-white',
  stack: 'bg-violet-500 text-white',
};

function SubstanceSubline({ item }: { item: Substance }) {
  const tagLabels = item.typeTags
    .slice(0, 2)
    .map(tag => TYPE_TAGS.find(t => t.full === tag)?.label)
    .filter((label): label is string => Boolean(label));

  return <span className="truncate">{[item.classification, ...tagLabels].join(' · ')}</span>;
}

function BrandSubline({ item }: { item: Brand }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="inline-flex shrink-0 items-center gap-1">
        <StarRating value={item.userRating} size={12} />
        {item.userRating.toFixed(1)}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-slate-400 dark:text-zinc-500">
        <Truck size={12} />
        {item.shippingReliability.toFixed(1)} shipping
      </span>
    </span>
  );
}

function StackSubline({ item }: { item: Stack }) {
  const count = item.substances.length;
  const preview = item.substances.slice(0, 2).map(s => s.name).join(', ');
  const extra = count > 2 ? ` +${count - 2} more` : '';
  return (
    <span className="truncate">
      {count} substance{count === 1 ? '' : 's'}{preview ? ` · ${preview}${extra}` : ''}
    </span>
  );
}

/** Rich, x.com-style row: avatar with a badge accent, name, and a meaningful sub-line. */
function PickerRow({ item, type, onSelect }: { item: PickerItem; type: CompareType; onSelect: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect(item.id)}
      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/60"
    >
      <span className="relative shrink-0">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold', AVATAR_STYLES[type])}>
          {initials(item.name)}
        </span>
        {type === 'substance' && (
          <AccessBadge
            classification={(item as Substance).classification}
            className="absolute -bottom-1 -right-1 h-4 w-4 border-2 border-white text-[8px] dark:border-zinc-900"
          />
        )}
        {type === 'brand' && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-white dark:border-zinc-900">
            <Star size={9} fill="currentColor" strokeWidth={0} />
          </span>
        )}
        {type === 'stack' && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-violet-600 text-white dark:border-zinc-900">
            <Layers size={9} />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-zinc-100">{item.name}</span>
        <span className="mt-0.5 flex items-center text-[13px] text-slate-500 dark:text-zinc-400">
          {type === 'substance' && <SubstanceSubline item={item as Substance} />}
          {type === 'brand' && <BrandSubline item={item as Brand} />}
          {type === 'stack' && <StackSubline item={item as Stack} />}
        </span>
      </span>

      <ChevronRight
        size={16}
        className="shrink-0 text-slate-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-zinc-600"
      />
    </button>
  );
}

const TOOLS: {
  type: CompareType;
  name: string;
  description: string;
  icon: typeof GitCompare;
  color: string;
  bg: string;
}[] = [
  {
    type: 'substance',
    name: 'Substance Compare',
    description: 'Compare two substances side by side.',
    icon: GitCompare,
    color: 'text-pink-500 dark:text-pink-400',
    bg: 'bg-pink-500/10',
  },
  {
    type: 'brand',
    name: 'Brand Compare',
    description: 'Compare two brands on reliability and testing.',
    icon: GitCompare,
    color: 'text-indigo-500 dark:text-indigo-400',
    bg: 'bg-indigo-500/10',
  },
  {
    type: 'stack',
    name: 'Stack Compare',
    description: 'Compare two stacks and their substances.',
    icon: Layers,
    color: 'text-violet-500 dark:text-violet-400',
    bg: 'bg-violet-500/10',
  },
];

export default function Lab() {
  const { substances: SUPPLEMENTS, brands: BRANDS, stacks: STACKS } = useCatalog();
  const [pickerType, setPickerType] = useState<CompareType | null>(null);
  const [search, setSearch] = useState('');
  const [compare, setCompare] = useState<{ type: CompareType; id: string } | null>(null);

  const items = useMemo(() => {
    if (pickerType === 'substance') return SUPPLEMENTS;
    if (pickerType === 'brand') return BRANDS;
    if (pickerType === 'stack') return STACKS;
    return [];
  }, [pickerType, SUPPLEMENTS, BRANDS, STACKS]);

  const filtered = items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));

  const openPicker = (type: CompareType) => {
    setSearch('');
    setPickerType(type);
  };

  const chooseBase = (id: string) => {
    if (!pickerType) return;
    setCompare({ type: pickerType, id });
    setPickerType(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 pb-24 md:pb-8 px-4 pt-6 max-w-3xl mx-auto w-full transition-colors duration-200">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Tools</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Compare substances, brands, and stacks side by side, or look up a term.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <button
            key={tool.type}
            onClick={() => openPicker(tool.type)}
            className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-all group text-left shadow-sm"
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
                tool.bg,
              )}
            >
              <tool.icon size={20} className={tool.color} />
            </div>
            <div>
              <span className="block text-sm font-semibold text-slate-700 dark:text-zinc-200 group-hover:text-slate-900 dark:group-hover:text-zinc-50 transition-colors">
                {tool.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-500">{tool.description}</span>
            </div>
          </button>
        ))}

        <Link
          to="/glossary"
          className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-all group text-left shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 transition-transform group-hover:scale-110">
            <BookOpen size={20} className="text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-700 dark:text-zinc-200 group-hover:text-slate-900 dark:group-hover:text-zinc-50 transition-colors">
              Glossary
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-500">
              Plain-language definitions for supplement and research terms.
            </span>
          </div>
        </Link>
      </div>

      {/* Base-item picker */}
      <Modal
        isOpen={pickerType !== null}
        onClose={() => setPickerType(null)}
        title={<span className="capitalize">Choose a {pickerType ?? ''} to compare</span>}
        panelClassName="flex w-full max-w-lg max-h-[80vh] flex-col"
      >
        <div className="border-b border-slate-200 p-4 dark:border-zinc-800">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" size={17} />
            <input
              type="text"
              autoFocus
              placeholder={`Search ${pickerType ?? ''}s...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:bg-zinc-900"
            />
          </div>
        </div>
        <div className="overflow-y-auto">
          {filtered.length > 0 && pickerType ? (
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/70">
              {filtered.map((item) => (
                <PickerRow key={item.id} item={item} type={pickerType} onSelect={chooseBase} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
                <SearchX size={20} className="text-slate-400 dark:text-zinc-500" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">No {pickerType}s found</p>
              <p className="max-w-xs text-xs text-slate-500 dark:text-zinc-500">
                {search ? `No matches for "${search}". Try a different search.` : `No ${pickerType}s available yet.`}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {compare && (
        <CompareModal
          isOpen={compare !== null}
          onClose={() => setCompare(null)}
          type={compare.type}
          baseItemId={compare.id}
        />
      )}
    </div>
  );
}
