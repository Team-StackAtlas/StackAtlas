import { useState } from 'react';
import { X } from 'lucide-react';

interface SuggestEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'substance' | 'stack' | 'brand';
  entityName: string;
}

export default function SuggestEditModal({ isOpen, onClose, entityType, entityName }: SuggestEditModalProps) {
  const [sources, setSources] = useState('');
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Your edit suggestion has been submitted for moderator review.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-200 dark:border-zinc-800">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">Suggest Edit for {entityName}</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-xl text-sm text-amber-800 dark:text-amber-300">
            <ul className="list-disc pl-4 space-y-1">
              <li>Submit 2 to 3 real sources.</li>
              <li>Sources should be credible articles, papers, or official references.</li>
              <li>Joke, fake, or duplicate submissions will be rejected.</li>
              <li>All submissions go to moderator review.</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Sources (URLs)
            </label>
            <textarea
              required
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
              className="w-full h-24 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Proposed Changes
            </label>
            <textarea
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what needs to be changed and why..."
              className="w-full h-32 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors"
            >
              Submit Edit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
