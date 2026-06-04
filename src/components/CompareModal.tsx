import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SUPPLEMENTS, STACKS, BRANDS, Supplement } from '../data/mockData';
import { Modal } from './ui/Modal';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'substance' | 'stack' | 'brand';
  baseItemId: string;
}

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
      panelClassName="flex max-h-[80vh] flex-col"
    >
      {type === 'substance' && (
        <p className="border-b border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
          Suggestions prioritize similar purpose/effects, then type and route.
        </p>
      )}

      <div className="border-b border-slate-200 p-4 dark:border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={`Search ${type}s to compare...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-none bg-slate-100 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="overflow-y-auto p-2">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className="group flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/50"
            >
              <div className="min-w-0 pr-3">
                <div className="font-medium text-slate-900 dark:text-zinc-100">{item.name}</div>
                {type === 'substance' && (
                  <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-slate-500 dark:text-zinc-400">
                    <span>{(item as Supplement).paths?.[0]?.category}</span>
                    <span>{(item as Supplement).typeTags?.[0]}</span>
                  </div>
                )}
              </div>
              <span className="text-xs font-medium text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-emerald-400">
                Compare
              </span>
            </button>
          ))
        ) : (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
            No {type}s found matching "{searchQuery}"
          </div>
        )}
      </div>
    </Modal>
  );
}
