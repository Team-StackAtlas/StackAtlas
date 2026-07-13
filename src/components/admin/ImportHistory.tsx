import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Loader2, RefreshCw } from 'lucide-react';
import { listImportBatches, revertImportBatch, type ImportBatchRecord } from '../../services/import';
import Badge from './Badge';

export default function ImportHistory({
  client,
  isOwner = false,
}: {
  client: SupabaseClient | null;
  isOwner?: boolean;
}) {
  const [batches, setBatches] = useState<ImportBatchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const revert = async (batch: ImportBatchRecord) => {
    if (!client) return;
    const confirmed = window.confirm(
      `Revert "${batch.label ?? 'this batch'}"? Findings, source links, and sources this batch created will be removed. Catalog entries are not affected.`,
    );
    if (!confirmed) return;
    setRevertingId(batch.id);
    setError('');
    try {
      await revertImportBatch(client, batch.id);
      setBatches(await listImportBatches(client));
    } catch (err) {
      console.error('Revert batch failed', err);
      setError(err instanceof Error ? err.message : 'Failed to revert the batch.');
    } finally {
      setRevertingId(null);
    }
  };

  const load = async () => {
    if (!client) return;
    setLoading(true);
    setError('');
    try {
      setBatches(await listImportBatches(client));
      setLoaded(true);
    } catch (err) {
      console.error('Load import history failed', err);
      setError(err instanceof Error ? err.message : 'Failed to load import history.');
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
        Backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to see import history.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
          {loaded ? `${batches.length} import batch${batches.length === 1 ? '' : 'es'}` : 'Import History'}
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
          Loading import history…
        </div>
      )}

      {!loading && loaded && batches.length === 0 && (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
          No import batches yet. Batches appear here after a data pack or CSV is imported.
        </p>
      )}

      <div className="space-y-2">
        {batches.map((batch) => (
          <div
            key={batch.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{batch.label ?? 'Untitled batch'}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {new Date(batch.createdAt).toLocaleString()}
                  {batch.generatedBy ? ` · ${batch.generatedBy}` : ''}
                  {batch.schemaVersion != null ? ` · schema v${batch.schemaVersion}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs">
                <Badge tone="slate">{batch.rowCount} rows</Badge>
                <Badge tone="green">{batch.importedCount} imported</Badge>
                <Badge tone="amber">{batch.skippedCount} skipped</Badge>
                {batch.errorCount > 0 && <Badge tone="red">{batch.errorCount} errors</Badge>}
                {batch.notes?.includes('reverted') && <Badge tone="red">Reverted</Badge>}
                {isOwner && !batch.notes?.includes('reverted') && (
                  <button
                    onClick={() => void revert(batch)}
                    disabled={revertingId === batch.id}
                    className="rounded-lg bg-red-100 px-2.5 py-1 font-semibold text-red-700 disabled:opacity-50 dark:bg-red-500/15 dark:text-red-300"
                    title="Remove the findings, source links, and sources this batch created"
                  >
                    {revertingId === batch.id ? 'Reverting…' : 'Revert'}
                  </button>
                )}
              </div>
            </div>
            {batch.entityCounts && Object.keys(batch.entityCounts).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(batch.entityCounts).map(([entity, count]) => (
                  <Badge key={entity} tone="blue">
                    {entity}: {String(count)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
