import { useMemo, useState } from 'react';
import { ChevronRight, Layers, Search, SearchX, Star, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SUPPLEMENTS, STACKS, BRANDS, Supplement, Brand, Stack, TYPE_TAGS } from '../data/mockData';
import { Modal } from './ui/Modal';
import AccessBadge from './AccessBadge';
import StarRating from './StarRating';
import { cn } from '../lib/utils';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'substance' | 'stack' | 'brand';
  baseItemId: string;
}

type CompareItem = Supplement | Brand | Stack;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenSet(values: string[]) {
  return new Set(values.flatMap(value => normalize(value).split(' ').filter(Boolean)));
}

function overlapScore(a: string[], b: string[], weight: number) {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  let score = 0;
  aTokens.forEach(token => {
    if (bTokens.has(token)) score += weight;
  });
  return score;
}

function substanceSimilarity(base: Supplement, candidate: Supplement) {
  let score = 0;

  score += overlapScore(
    [...base.subjectiveEffects, ...base.paths.map(path => path.category), ...(base.markers || []), ...base.possiblePairings],
    [...candidate.subjectiveEffects, ...candidate.paths.map(path => path.category), ...(candidate.markers || []), ...candidate.possiblePairings],
    8
  );

  score += overlapScore(base.typeTags, candidate.typeTags, 3);
  score += overlapScore(base.administration, candidate.administration, 2);
  score += overlapScore([base.classification], [candidate.classification], 1);

  if (base.possiblePairings.some(pairing => normalize(pairing) === normalize(candidate.name))) score += 10;
  if (candidate.possiblePairings.some(pairing => normalize(pairing) === normalize(base.name))) score += 10;

  return score;
}

/** First-letter avatar initial. */
function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

const AVATAR_STYLES: Record<CompareModalProps['type'], string> = {
  substance: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300',
  brand: 'bg-indigo-500 text-white',
  stack: 'bg-violet-500 text-white',
};

function SubstanceSubline({ item }: { item: Supplement }) {
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
function CompareRow({ item, type, onSelect }: { item: CompareItem; type: CompareModalProps['type']; onSelect: (id: string) => void }) {
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
            classification={(item as Supplement).classification}
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
          {type === 'substance' && <SubstanceSubline item={item as Supplement} />}
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

export function CompareModal({ isOpen, onClose, type, baseItemId }: CompareModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const items = type === 'substance' ? SUPPLEMENTS : type === 'stack' ? STACKS : BRANDS;
  const baseItem = items.find(item => item.id === baseItemId);

  const filteredItems = useMemo(() => {
    const query = normalize(searchQuery);

    return items
      .filter(item => item.id !== baseItemId)
      .filter(item => {
        if (!query) return true;
        return normalize(`${item.name} ${'description' in item ? item.description || '' : ''}`).includes(query);
      })
      .sort((a, b) => {
        if (type === 'substance' && baseItem) {
          return substanceSimilarity(baseItem as Supplement, b as Supplement) - substanceSimilarity(baseItem as Supplement, a as Supplement);
        }

        if (type === 'stack' && baseItem && 'substances' in baseItem) {
          const baseSubstances = new Set(baseItem.substances.map(substance => substance.id));
          const aOverlap = 'substances' in a ? a.substances.filter(substance => baseSubstances.has(substance.id)).length : 0;
          const bOverlap = 'substances' in b ? b.substances.filter(substance => baseSubstances.has(substance.id)).length : 0;
          return bOverlap - aOverlap;
        }

        if (type === 'brand' && baseItem && 'markers' in baseItem) {
          const baseMarkers = baseItem.markers || [];
          const aScore = 'markers' in a ? overlapScore(baseMarkers, a.markers || [], 4) : 0;
          const bScore = 'markers' in b ? overlapScore(baseMarkers, b.markers || [], 4) : 0;
          return bScore - aScore;
        }

        return a.name.localeCompare(b.name);
      });
  }, [baseItem, baseItemId, items, searchQuery, type]);

  const handleSelect = (id: string) => {
    navigate(`/compare?type=${type}&id1=${baseItemId}&id2=${id}`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="capitalize">Compare {type}</span>}
      panelClassName="flex w-full max-w-lg max-h-[80vh] flex-col"
    >
      {type === 'substance' && (
        <p className="border-b border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
          Suggestions prioritize similar purpose/effects, then type and route.
        </p>
      )}

      <div className="border-b border-slate-200 p-4 dark:border-zinc-800">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" size={17} />
          <input
            type="text"
            placeholder={`Search ${type}s to compare...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:bg-zinc-900"
          />
        </div>
      </div>

      <div className="overflow-y-auto">
        {filteredItems.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/70">
            {filteredItems.map((item) => (
              <CompareRow key={item.id} item={item} type={type} onSelect={handleSelect} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
              <SearchX size={20} className="text-slate-400 dark:text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">No {type}s found</p>
            <p className="max-w-xs text-xs text-slate-500 dark:text-zinc-500">
              {searchQuery ? `No matches for "${searchQuery}". Try a different search.` : `No other ${type}s available yet.`}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
