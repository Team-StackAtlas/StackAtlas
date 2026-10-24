import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import Badge, { type BadgeTone } from './Badge';

type Status = 'needs_review' | 'rejected' | 'published' | 'reverted';

interface Submission {
  id: string;
  label: string;
  client_name: string | null;
  is_test: boolean;
  status: Status;
  payload: {
    substance_updates?: { slug: string; description?: string; rationale?: string; origin?: string; half_life?: string }[];
    glossary_terms?: { term: string; definition: string; category?: string; detail?: string; tags?: string[]; bearings?: string[] }[];
    sources?: { title: string; pmid?: string; doi?: string; url?: string; year?: number; substances: string[] }[];
    findings?: { substance_slug: string; endpoint: string; direction: string; finding_summary: string; study_type?: string }[];
  };
  report: {
    validation?: { counts?: Record<string, Record<string, number>>; issues?: { entity: string; index: number | null; severity: string; kind: string; message: string }[] };
    pmid_checks?: { pmid: string; status: string; detail: string }[];
    policy?: string;
  };
  substance_slugs: string[];
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const STATUS_TONE: Record<Status, BadgeTone> = { needs_review: 'amber', published: 'green', rejected: 'red', reverted: 'slate' };
const STATUS_LABEL: Record<Status, string> = { needs_review: 'Needs review', published: 'Published', rejected: 'Rejected', reverted: 'Reverted' };

/**
 * The primary Admin → Research surface: what regular Claude has submitted
 * through the connector, what each submission proposes, why rows were
 * rejected, and one-click approve / reject / revert through the owner-only
 * RPCs. Sources and findings are already staged when a row appears here;
 * descriptions and glossary terms are applied only on approve.
 */
export default function ResearchSubmissions({ client, isOwner }: { client: SupabaseClient | null; isOwner: boolean }) {
  const [rows, setRows] = useState<Submission[]>([]);
  const [current, setCurrent] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | 'all'>('needs_review');

  const load = async () => {
    if (!client) return;
    setLoading(true); setError('');
    try {
      const { data, error: err } = await client.from('research_submissions').select('*').order('created_at', { ascending: false }).limit(100);
      if (err) throw err;
      const list = (data ?? []) as Submission[];
      setRows(list);
      // Current descriptions, so a proposal can be shown side by side.
      const slugs = [...new Set(list.flatMap((r) => (r.payload.substance_updates ?? []).map((u) => u.slug)))];
      if (slugs.length) {
        const { data: subs } = await client.from('substances').select('slug, description').in('slug', slugs);
        setCurrent(Object.fromEntries((subs ?? []).map((s) => [s.slug, s.description])));
      }
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const act = async (row: Submission, fn: 'admin_publish_research_submission' | 'admin_reject_research_submission' | 'admin_revert_research_submission') => {
    if (!client) return;
    const verb = fn.includes('publish') ? 'Approve and publish' : fn.includes('reject') ? 'Reject' : 'Revert';
    const note = window.prompt(`${verb} "${row.label}"? Optional note for the audit log:`);
    if (note === null) return;
    setBusy(row.id); setError('');
    try {
      const { error: err } = await client.rpc(fn, { p_id: row.id, p_note: note || null });
      if (err) throw err;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  if (!client) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">Backend not configured.</p>;

  const visible = rows.filter((r) => filter === 'all' || r.status === filter);
  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(['needs_review', 'published', 'rejected', 'reverted', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>
              {f === 'all' ? 'All' : STATUS_LABEL[f]} {f === 'all' ? rows.length : counts[f] ?? 0}
            </button>
          ))}
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 dark:bg-zinc-800">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && !loaded && <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950"><Loader2 size={16} className="animate-spin" /> Loading submissions…</div>}
      {loaded && visible.length === 0 && (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
          {rows.length === 0 ? 'No submissions yet. Once the research connector is set up, batches regular Claude submits appear here.' : 'Nothing with this status.'}
        </p>
      )}

      <div className="space-y-2">
        {visible.map((r) => {
          const v = r.report.validation?.counts ?? {};
          const n = (k: string, f: string) => v[k]?.[f] ?? 0;
          const expanded = open === r.id;
          const errors = (r.report.validation?.issues ?? []).filter((i) => i.severity === 'error');
          const warnings = (r.report.validation?.issues ?? []).filter((i) => i.severity === 'warning');
          return (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <button onClick={() => setOpen(expanded ? null : r.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.label}</span>
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    {r.is_test && <Badge tone="purple">test</Badge>}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">
                    {new Date(r.created_at).toLocaleString()} · {r.client_name ?? 'unknown client'} · {r.substance_slugs.join(', ') || 'no substances'}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600 dark:text-zinc-300">
                    {n('substance_updates', 'accepted')} description{n('substance_updates', 'accepted') === 1 ? '' : 's'} · {n('sources', 'accepted')} sources · {n('findings', 'accepted')} findings · {n('glossary_terms', 'accepted')} glossary
                    {errors.length > 0 && <span className="text-red-600 dark:text-red-400"> · {errors.length} rejected row{errors.length === 1 ? '' : 's'}</span>}
                  </span>
                </span>
                {expanded ? <ChevronDown size={16} className="mt-1 shrink-0 text-slate-400" /> : <ChevronRight size={16} className="mt-1 shrink-0 text-slate-400" />}
              </button>

              {expanded && (
                <div className="space-y-4 border-t border-slate-100 p-4 text-sm dark:border-zinc-800">
                  {(r.payload.substance_updates ?? []).map((u) => (
                    <div key={u.slug} className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-950/60">
                      <div className="mb-2 font-semibold">{u.slug}</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div><div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Current</div><p className="text-slate-600 dark:text-zinc-400">{current[u.slug] ?? '—'}</p></div>
                        <div><div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Proposed</div><p>{u.description ?? '(no description change)'}</p></div>
                      </div>
                      {(u.origin || u.half_life) && <p className="mt-2 text-xs text-slate-500">{u.origin && <>origin: {u.origin} </>}{u.half_life && <>· half-life: {u.half_life}</>}</p>}
                      {u.rationale && <p className="mt-2 text-xs italic text-slate-500">Researcher note: {u.rationale}</p>}
                    </div>
                  ))}

                  {(r.payload.glossary_terms ?? []).length > 0 && (
                    <div>
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Glossary terms</div>
                      <ul className="space-y-1">
                        {(r.payload.glossary_terms ?? []).map((g) => <li key={g.term}><strong>{g.term}</strong>{g.category ? <span className="text-slate-500"> · {g.category}</span> : null}: {g.definition}</li>)}
                      </ul>
                    </div>
                  )}

                  {(r.payload.sources ?? []).length > 0 && (
                    <div>
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Sources staged</div>
                      <ul className="space-y-1 text-xs">
                        {(r.payload.sources ?? []).map((s, i) => {
                          const check = r.report.pmid_checks?.find((c) => c.pmid === s.pmid);
                          return (
                            <li key={i}>
                              {s.title} {s.year ? `(${s.year})` : ''} {s.pmid && <a className="text-emerald-700 underline dark:text-emerald-400" href={`https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`} target="_blank" rel="noreferrer">PMID {s.pmid}</a>}
                              {check && <Badge tone={check.status === 'match' ? 'green' : check.status === 'unverified' ? 'amber' : 'red'} className="ml-1">{check.status}</Badge>}
                              <span className="text-slate-500"> · {s.substances.join(', ')}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-1 text-[11px] text-slate-500">A PMID "match" means the paper exists and its title and year agree with the batch. It does not mean the paper supports any claim; read it.</p>
                    </div>
                  )}

                  {(r.payload.findings ?? []).length > 0 && (
                    <div>
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Findings staged (approved on publish)</div>
                      <ul className="space-y-1 text-xs">
                        {(r.payload.findings ?? []).map((f, i) => <li key={i}><strong>{f.substance_slug}</strong> · {f.endpoint} {f.direction.replace('_', ' ')}{f.study_type ? ` · ${f.study_type}` : ''}: {f.finding_summary}</li>)}
                      </ul>
                    </div>
                  )}

                  {(errors.length > 0 || warnings.length > 0) && (
                    <div>
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Validation</div>
                      <ul className="space-y-0.5 text-xs">
                        {errors.map((i, k) => <li key={`e${k}`} className="text-red-700 dark:text-red-300">✕ {i.entity}{i.index !== null ? `[${i.index}]` : ''}: {i.message}</li>)}
                        {warnings.map((i, k) => <li key={`w${k}`} className="text-amber-700 dark:text-amber-300">△ {i.entity}{i.index !== null ? `[${i.index}]` : ''}: {i.message}</li>)}
                      </ul>
                    </div>
                  )}

                  {r.review_note && <p className="text-xs text-slate-500">Review note: {r.review_note}</p>}

                  {isOwner && (
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-zinc-800">
                      {r.status === 'needs_review' && (
                        <>
                          <button disabled={busy === r.id} onClick={() => void act(r, 'admin_publish_research_submission')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><CheckCircle2 size={13} /> Approve &amp; publish</button>
                          <button disabled={busy === r.id} onClick={() => void act(r, 'admin_reject_research_submission')} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300"><XCircle size={13} /> Reject</button>
                        </>
                      )}
                      {r.status === 'published' && (
                        <button disabled={busy === r.id} onClick={() => void act(r, 'admin_revert_research_submission')} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200"><RotateCcw size={13} /> Revert</button>
                      )}
                      {busy === r.id && <Loader2 size={14} className="animate-spin self-center" />}
                    </div>
                  )}
                  {!isOwner && <p className="text-xs text-slate-500">Only the site owner can approve, reject, or revert.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
