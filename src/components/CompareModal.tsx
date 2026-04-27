import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SUPPLEMENTS, STACKS, BRANDS } from '../data/mockData';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'substance' | 'stack' | 'brand';
  baseItemId: string;
}

export function CompareModal({ isOpen, onClose, type, baseItemId }: CompareModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

  let items: any[] = [];
  if (type === 'substance') {
    items = SUPPLEMENTS;
  } else if (type === 'stack') {
    items = STACKS;
  } else if (type === 'brand') {
    items = BRANDS;
  }

  const filteredItems = items.filter(item => 
    item.id !== baseItemId && 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (id: string) => {
    navigate(`/compare?type=${type}&id1=${baseItemId}&id2=${id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-md overflow-hidden shadow-xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 capitalize">Compare {type}</h2>
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
                <div>
                  <div className="font-medium text-slate-900 dark:text-zinc-100">{item.name}</div>
                  {type === 'substance' && <div className="text-xs text-slate-500 dark:text-zinc-400">{item.typeTags?.[0]}</div>}
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
