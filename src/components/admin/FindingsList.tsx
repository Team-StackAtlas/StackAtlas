import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Info, Loader2, RefreshCw } from 'lucide-react';
import { listFindings, type FindingEntry } from '../../services/import';
import Badge from './Badge';
import { findingDirectionLabel, findingDirectionTone, reviewStatusLabel, reviewStatusTone, studyTypeLabel } from './adminLabels';

export default function FindingsList({ client }: { client: SupabaseClient | null }) {
  const [entries, setEntries] = useState<FindingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const review = async (id: string, status: 'approved' | 'rejected' | 'pending_review') => {
    if (!client) return;
    setReviewingId(id);
    setError('');
    try {
      const { error: rpcError } = await client.rpc('admin_review_finding', {
        p_finding_id: id,
        p_status: status,
      });
      if (rpcError) throw rpcError;
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, reviewStatus: status } : e)));
    } catch (err) {
      console.error('Review finding failed', err);
      setError(err instanceof Error ? err.message : 'Failed to update the finding.');
    } finally {
      setReviewingId(null);
    }
  };

  const load = async () => {
    if (!client) return;
    setLoading(true);
    setError('');
    try {
      setEntries(await listFindings(client));
      setLoaded(true);
    } catch (err) {
      console.error('Load findings failed', err);
      setError(err instanceof Error ? err.message : 'Failed to load findings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  if (!client) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
        Backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to review findings.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>Findings never publish automatically — they stay internal until reviewed.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
          {loaded ? `${entries.length} finding${entries.length === 1 ? '' : 's'}` : 'Findings'}
        </h2>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 dark:bg-zinc-800"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <span>{error}</span>
          <button
            onClick={() => void load()}
            className="shrink-0 rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold dark:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !loaded && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
          <Loader2 size={16} className="animate-spin" />
          Loading findings…
        </div>
      )}

      {!loading && loaded && entries.length === 0 && (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
          No findings yet. Findings are added by importing a data pack with a findings section.
        </p>
      )}

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{entry.endpoint}</p>
                <p className="mt-0.5 text-xs text-slate-500">{entry.findingSummary}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <Badge tone={findingDirectionTone(entry.direction)}>
                  {findingDirectionLabel(entry.direction)}
                </Badge>
                <Badge tone={reviewStatusTone(entry.reviewStatus)}>
                  {reviewStatusLabel(entry.reviewStatus)}
                </Badge>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              {entry.substance && <Badge tone="slate">{entry.substance.name}</Badge>}
              {entry.doseAmount != null && (
                <span>
                  Dose: {entry.doseAmount}
                  {entry.doseUnit ?? ''}
                </span>
              )}
              {entry.population && <span>Population: {entry.population}</span>}
              {entry.studyType && <span>{studyTypeLabel(entry.studyType)}</span>}
              <span>Source: {entry.sourceTitle ?? 'Unknown source'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.reviewStatus === 'pending_review' ? (
                <>
                  <button
                    onClick={() => void review(entry.id, 'approved')}
                    disabled={reviewingId === entry.id}
                    className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-50 dark:bg-emerald-500/15 dark:text-emerald-300"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => void review(entry.id, 'rejected')}
                    disabled={reviewingId === entry.id}
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-50 dark:bg-red-500/15 dark:text-red-300"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <button
                  onClick={() => void review(entry.id, 'pending_review')}
                  disabled={reviewingId === entry.id}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  Reopen review
                </button>
              )}
              {reviewingId === entry.id && <Loader2 size={14} className="animate-spin self-center" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
