import { useState } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { SUPPLEMENTS, STACKS, Stack } from '../data/mockData';
import { useNavigate } from 'react-router-dom';
import { useUserScope } from '../context/UserScopeContext';

interface CreateStackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRIVIAL_ADJUNCTS = ['caffeine', 'creatine', 'nicotine', 'fish oil', 'vitamin d'];

export default function CreateStackModal({ isOpen, onClose }: CreateStackModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubstances, setSelectedSubstances] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { scope } = useUserScope();

  if (!isOpen) return null;

  const filteredSupplements = SUPPLEMENTS.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedSubstances.includes(s.id)
  );

  const toggleSubstance = (id: string) => {
    if (selectedSubstances.includes(id)) {
      setSelectedSubstances(prev => prev.filter(s => s !== id));
    } else {
      if (selectedSubstances.length >= 5) {
        alert('Maximum 5 substances allowed per stack.');
        return;
      }
      setSelectedSubstances(prev => [...prev, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSubstances.length < 2) {
      alert('A stack must contain at least 2 substances.');
      return;
    }

    // Check for duplicates ignoring trivial adjuncts
    const getCoreSubstances = (substanceIds: string[]) => {
      return substanceIds.filter(id => {
        const sub = SUPPLEMENTS.find(s => s.id === id);
        return sub && !TRIVIAL_ADJUNCTS.some(adj => sub.name.toLowerCase().includes(adj));
      }).sort();
    };

    const newCore = getCoreSubstances(selectedSubstances);

    const duplicateStack = STACKS.find(stack => {
      const existingCore = getCoreSubstances(stack.substances.map(s => s.id));
      if (existingCore.length !== newCore.length) return false;
      return existingCore.every((id, index) => id === newCore[index]);
    });

    if (duplicateStack) {
      alert(`This core combination already exists as "${duplicateStack.name}". Redirecting...`);
      onClose();
      navigate(`/stack/${duplicateStack.id}`);
      return;
    }

    // In a real app, we would save this to the backend.
    const newStack: Stack = {
      id: `st_${Date.now()}`,
      name,
      description,
      substances: selectedSubstances.map(id => ({
        id,
        name: SUPPLEMENTS.find(s => s.id === id)?.name || id
      })),
      creatorId: 'u1', // Current user
      createdAt: new Date().toISOString(),
      status: 'pending',
      markers: []
    };
    STACKS.push(newStack);

    alert('Stack submitted for review! It will be visible only to you until approved.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl border border-slate-200 dark:border-zinc-800 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">Create New Stack</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Stack Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Deep Sleep Protocol"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Description
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this stack used for?"
                className="w-full h-24 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                Substances ({selectedSubstances.length}/5)
              </label>
              
              {/* Selected Substances */}
              {selectedSubstances.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700">
                  {selectedSubstances.map(id => {
                    const sub = SUPPLEMENTS.find(s => s.id === id);
                    if (!sub) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        {sub.name}
                        <button
                          type="button"
                          onClick={() => toggleSubstance(id)}
                          className="hover:text-emerald-900 dark:hover:text-emerald-100"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Search and Add */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search substances to add..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>

              {searchQuery && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-700 divide-y divide-slate-100 dark:divide-zinc-800">
                  {filteredSupplements.length > 0 ? (
                    filteredSupplements.map(sub => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          toggleSubstance(sub.id);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left"
                      >
                        <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">{sub.name}</span>
                        <Plus size={16} className="text-slate-400" />
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-slate-500 dark:text-zinc-400 text-center">
                      No substances found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedSubstances.length < 2}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              Submit Stack
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
