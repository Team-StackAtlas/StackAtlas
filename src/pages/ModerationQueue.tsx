import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { ModerationQueueItem, ModerationStatus } from '../services/types';

const FILTERS = [
  ['all', 'All'],
  ['report', 'Reports'],
  ['suggest_edit', 'Suggest Edits'],
  ['pending', 'Pending'],
  ['reviewed', 'Reviewed'],
  ['rejected', 'Rejected'],
  ['action_taken', 'Action Taken'],
] as const;

export default function ModerationQueue() {
  const { services, isBackendConfigured } = useAuth();
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadQueue = async () => {
    if (!isBackendConfigured || !services) {
      setError('Moderation queue requires Supabase.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setItems(await services.moderation.listQueue());
    } catch (err) {
      console.error('Moderation queue load failed', err);
      setError(err instanceof Error ? err.message : 'Failed to load moderation queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `loadQueue` is redefined every render; including it would refetch on every render instead of only when auth state changes.
  }, [isBackendConfigured, services]);

  const visibleItems = useMemo(() => items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'report' || filter === 'suggest_edit') return item.submissionType === filter;
    return item.status === filter;
  }), [filter, items]);

  const updateStatus = async (item: ModerationQueueItem, status: ModerationStatus) => {
    if (!services) return;
    try {
      await services.moderation.updateStatus(item.submissionType, item.id, status);
      setItems((current) => current.map((candidate) => candidate.id === item.id && candidate.submissionType === item.submissionType ? { ...candidate, status } : candidate));
    } catch (err) {
      console.error('Moderation status update failed', err);
      setError(err instanceof Error ? err.message : 'Failed to update queue status.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 pb-12 pt-6">
      <div>
        <h1 className="text-3xl font-black text-slate-950 dark:text-zinc-50">Moderation Queue</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">PR 7 shell for private reports and suggest-edit submissions. Actions only update queue status.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${filter === value ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'}`}>{label}</button>)}
      </div>
      {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">{error}</div>}
      {loading ? <div className="text-sm text-slate-500">Loading queue…</div> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-zinc-800">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-zinc-950 dark:text-zinc-400"><tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Reason / Field</th><th className="px-4 py-3">Preview</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {visibleItems.map((item) => <tr key={`${item.submissionType}-${item.id}`}><td className="px-4 py-3 font-semibold">{item.submissionType === 'report' ? 'Report' : 'Suggest Edit'}</td><td className="px-4 py-3"><span className="font-medium">{item.targetType}</span><br /><span className="text-xs text-slate-500">{item.targetLabel ?? item.targetId}</span></td><td className="px-4 py-3">{item.username ? `@${item.username}` : 'Unknown'}</td><td className="px-4 py-3">{item.reason ?? item.targetField ?? '—'}</td><td className="max-w-xs px-4 py-3 text-slate-600 dark:text-zinc-300">{item.preview ? `${item.preview.slice(0, 120)}${item.preview.length > 120 ? '…' : ''}` : '—'}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold dark:bg-zinc-800">{item.status}</span></td><td className="px-4 py-3 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1"><button onClick={() => updateStatus(item, 'reviewed')} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold hover:bg-slate-200 dark:bg-zinc-800">Mark reviewed</button><button onClick={() => updateStatus(item, 'rejected')} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300">Reject</button><button onClick={() => updateStatus(item, 'action_taken')} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300">Action taken</button></div></td></tr>)}
                {visibleItems.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No submissions match this filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
