import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { useToast } from './ui/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from '../hooks/useRequireAccountAction';

const FIELD_OPTIONS = {
  substance: ['Name', 'Description', 'Categories', 'Bearings', 'Aliases', 'Safety information', 'Other'],
  brand: ['Name', 'Description', 'Website', 'Products', 'Testing / COA information', 'Other'],
  stack: ['Name', 'Description', 'Components', 'Categories', 'Bearings', 'Other'],
};

interface SuggestEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'substance' | 'stack' | 'brand';
  entityName: string;
  targetId: string;
}

export default function SuggestEditModal({ isOpen, onClose, entityType, entityName, targetId }: SuggestEditModalProps) {
  const [targetField, setTargetField] = useState('');
  const [suggestionText, setSuggestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isBackendConfigured, services, user } = useAuth();
  const requireAccount = useRequireAccountAction();
  const { toast } = useToast();

  const closeAndReset = () => {
    setTargetField('');
    setSuggestionText('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAccount()) return;
    if (suggestionText.trim().length < 10) {
      toast('Please explain the suggested edit in at least 10 characters.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (!isBackendConfigured || !services || !user) throw new Error('Suggest edit submission requires a configured Supabase session.');
      await services.suggestEdits.create(user.id, {
        targetType: entityType,
        targetId,
        targetField: targetField || undefined,
        suggestionText: suggestionText.trim(),
      });
      toast('Suggest edit submitted', 'success');
      closeAndReset();
    } catch (err) {
      console.error('Suggest edit submission failed', err);
      toast(err instanceof Error ? err.message : 'Failed to submit edit suggestion.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeAndReset} title={`Suggest Edit for ${entityName}`}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div>
          <label htmlFor="suggestTargetField" className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">Target field (Optional)</label>
          <select id="suggestTargetField" value={targetField} onChange={(e) => setTargetField(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
            <option value="">Select a field...</option>
            {FIELD_OPTIONS[entityType].map((field) => <option key={field} value={field}>{field}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="suggestDetails" className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">Explanation</label>
          <textarea id="suggestDetails" required minLength={10} value={suggestionText} onChange={(e) => setSuggestionText(e.target.value)} placeholder="Describe what should change and why..." className="h-32 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={closeAndReset} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit'}</button>
        </div>
      </form>
    </Modal>
  );
}
