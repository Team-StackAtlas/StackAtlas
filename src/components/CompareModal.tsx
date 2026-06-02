import { useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SUPPLEMENTS, STACKS, BRANDS, Supplement } from '../data/mockData';

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
  score += overlapScore(base.status, candidate.status, 1);

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

  if (!isOpen) return null;

  const handleSelect = (id: string) => {
    navigate(`/compare?type=${type}&id1=${baseItemId}&id2=${id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-md overflow-hidden shadow-xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 capitalize">Compare {type}</h2>
            {type === 'substance' && <p className="text-xs text-slate-500 dark:text-zinc-400">Suggestions prioritize similar purpose/effects, then type and route.</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} className="text-slate-500 dark:text-zinc-400" />
          </button>
        </div>
        
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={`Search ${type}s to compare...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-zinc-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-2">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors flex items-center justify-between group"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-medium text-slate-900 dark:text-zinc-100">{item.name}</div>
                  {type === 'substance' && (
                    <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-slate-500 dark:text-zinc-400">
                      {(item as Supplement).formula && <span className="font-mono">{(item as Supplement).formula}</span>}
                      <span>{(item as Supplement).paths?.[0]?.category}</span>
                      <span>{(item as Supplement).typeTags?.[0]}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </div>
    </div>
  );
}
