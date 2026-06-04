import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { SUPPLEMENTS, STACKS, Stack } from '../data/mockData';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui/Modal';
import { useToast } from './ui/ToastProvider';

interface CreateStackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRIVIAL_ADJUNCTS = ['caffeine', 'creatine', 'nicotine', 'fish oil', 'vitamin d'];
const MAX_SUBSTANCES = 5;
const MIN_SUBSTANCES = 2;

export default function CreateStackModal({ isOpen, onClose }: CreateStackModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubstances, setSelectedSubstances] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const filteredSupplements = SUPPLEMENTS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedSubstances.includes(s.id),
  );

  const belowMinimum = selectedSubstances.length < MIN_SUBSTANCES;

  const toggleSubstance = (id: string) => {
    if (selectedSubstances.includes(id)) {
      setSelectedSubstances((prev) => prev.filter((s) => s !== id));
    } else {
      if (selectedSubstances.length >= MAX_SUBSTANCES) {
        toast(`Maximum ${MAX_SUBSTANCES} substances allowed per stack.`, 'info');
        return;
      }
      setSelectedSubstances((prev) => [...prev, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (belowMinimum) return;

    // Check for duplicates ignoring trivial adjuncts
    const getCoreSubstances = (substanceIds: string[]) => {
      return substanceIds
        .filter((id) => {
          const sub = SUPPLEMENTS.find((s) => s.id === id);
          return sub && !TRIVIAL_ADJUNCTS.some((adj) => sub.name.toLowerCase().includes(adj));
        })
        .sort();
    };

    const newCore = getCoreSubstances(selectedSubstances);

    const duplicateStack = STACKS.find((stack) => {
      const existingCore = getCoreSubstances(stack.substances.map((s) => s.id));
      if (existingCore.length !== newCore.length) return false;
      return existingCore.every((id, index) => id === newCore[index]);
    });

    if (duplicateStack) {
      toast(`This core combination already exists as "${duplicateStack.name}". Redirecting...`, 'info');
      onClose();
      navigate(`/stack/${duplicateStack.id}`);
      return;
    }

    // In a real app, we would save this to the backend.
    const newStack: Stack = {
      id: `st_${Date.now()}`,
      name,
      description,
      substances: selectedSubstances.map((id) => ({
        id,
        name: SUPPLEMENTS.find((s) => s.id === id)?.name || id,
      })),
      creatorId: 'u1', // Current user
      createdAt: new Date().toISOString(),
      status: 'pending',
      markers: [],
    };
    STACKS.push(newStack);

    toast('Stack submitted for review! It will be visible only to you until approved.', 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Stack"
      panelClassName="flex max-h-[90vh] max-w-2xl flex-col"
    >
      <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="stackName"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
            >
              Stack Name
            </label>
            <input
              id="stackName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Deep Sleep Protocol"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          <div>
            <label
              htmlFor="stackDescription"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
            >
              Description
            </label>
            <textarea
              id="stackDescription"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this stack used for?"
              className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-zinc-300">
              Substances ({selectedSubstances.length}/{MAX_SUBSTANCES})
            </label>

            {/* Selected Substances */}
            {selectedSubstances.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                {selectedSubstances.map((id) => {
                  const sub = SUPPLEMENTS.find((s) => s.id === id);
                  if (!sub) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                    >
                      {sub.name}
                      <button
                        type="button"
                        aria-label={`Remove ${sub.name}`}
                        onClick={() => toggleSubstance(id)}
                        className="hover:text-emerald-900 dark:hover:text-emerald-100"
                      >
                        <Plus size={14} className="rotate-45" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search and Add */}
            <div className="relative mb-2">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search substances to add..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            {belowMinimum && (
              <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
                Add at least {MIN_SUBSTANCES} substances to create a stack.
              </p>
            )}

            {searchQuery && (
              <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-700">
                {filteredSupplements.length > 0 ? (
                  filteredSupplements.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        toggleSubstance(sub.id);
                        setSearchQuery('');
                      }}
                      className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800"
                    >
                      <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                        {sub.name}
                      </span>
                      <Plus size={16} className="text-slate-400" />
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-sm text-slate-500 dark:text-zinc-400">
                    No substances found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={belowMinimum}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit Stack
          </button>
        </div>
      </form>
    </Modal>
  );
}
