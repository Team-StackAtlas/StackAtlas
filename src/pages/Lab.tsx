import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, GitCompare, Layers, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCatalog } from '../context/CatalogContext';
import { Modal } from '../components/ui/Modal';
import { CompareModal } from '../components/CompareModal';

type CompareType = 'substance' | 'brand' | 'stack';

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
        <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Compare</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Pick a starting item, then choose what to compare it against.
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
      </div>

      <Link
        to="/glossary"
        className="mt-3 flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-all group text-left shadow-sm"
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

      {/* Base-item picker */}
      <Modal
        isOpen={pickerType !== null}
        onClose={() => setPickerType(null)}
        title={`Choose a ${pickerType ?? ''} to compare`}
        panelClassName="flex max-h-[80vh] flex-col"
      >
        <div className="border-b border-slate-200 p-4 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              autoFocus
              placeholder={`Search ${pickerType ?? ''}s...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-none bg-slate-100 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>
        <div className="overflow-y-auto p-2">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => chooseBase(item.id)}
                className="w-full rounded-xl p-3 text-left font-medium text-slate-900 transition-colors hover:bg-slate-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
              >
                {item.name}
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
              No {pickerType}s found matching "{search}"
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
