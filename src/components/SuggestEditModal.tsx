import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { useToast } from './ui/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from '../hooks/useRequireAccountAction';

interface SuggestEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'substance' | 'stack' | 'brand';
  entityName: string;
  targetId?: string;
}

export default function SuggestEditModal({ isOpen, onClose, entityType, entityName, targetId }: SuggestEditModalProps) {
  const [sources, setSources] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isBackendConfigured, services, user } = useAuth();
  const requireAccount = useRequireAccountAction();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAccount()) return;
    setSubmitting(true);
    try {
      if (isBackendConfigured && services && user) {
        await services.suggestEdits.create(user.id, {
          targetType: entityType,
          targetId: targetId ?? entityName,
          sources,
          details,
        });
      }
      toast('Your edit suggestion has been submitted for moderator review.', 'success');
      setSources('');
      setDetails('');
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to submit edit suggestion.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Suggest Edit for ${entityName}`}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <ul className="list-disc space-y-1 pl-4">
            <li>Submit 2 to 3 real sources.</li>
            <li>Sources should be credible articles, papers, or official references.</li>
            <li>Joke, fake, or duplicate submissions will be rejected.</li>
            <li>All submissions go to moderator review.</li>
          </ul>
        </div>

        <div>
          <label htmlFor="suggestSources" className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">
            Sources (URLs)
          </label>
          <textarea
            id="suggestSources"
            required
            value={sources}
            onChange={(e) => setSources(e.target.value)}
            placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
            className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div>
          <label htmlFor="suggestDetails" className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">
            Proposed Changes
          </label>
          <textarea
            id="suggestDetails"
            required
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe what needs to be changed and why..."
            className="h-32 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit Edit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
