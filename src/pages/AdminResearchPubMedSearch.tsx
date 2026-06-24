import { useMemo, useState } from 'react';
import { searchPubMedSources, type PubMedSourceResult } from '../services/research/pubmed';
import { supabase } from '../services/supabase/client';

type Row = Record<string, unknown>;
type DuplicateStatus = 'New' | 'Already Imported' | 'Possible Duplicate';

function val(v: unknown) { return typeof v === 'string' || typeof v === 'number' ? String(v) : ''; }
function normalizeTitle(title: string) { return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function errMessage(e: unknown) { return e instanceof Error ? e.message : 'Unknown error'; }

export default function AdminResearchPubMedSearch({ run, sources, onClose, onImported }: { run: Row; sources: Row[]; onClose: () => void; onImported: () => Promise<void> }) {
  const substanceName = val((run.substances as Row)?.name);
  const [query, setQuery] = useState(substanceName);
  const [maxResults, setMaxResults] = useState('10');
  const [results, setResults] = useState<PubMedSourceResult[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');


  const statuses = useMemo(() => new Map(results.map((result) => [result.pmid, duplicateStatus(result, sources)])), [results, sources]);

  const search = async () => {
    if (!supabase) return;
    setSearching(true);
    setMessage('');
    setSelected([]);
    try {
      const { error } = await supabase.from('research_runs').update({ status: 'collecting_sources', updated_at: new Date().toISOString() }).eq('id', run.id);
      if (error) throw error;
      await onImported();
      setResults(await searchPubMedSources(query, Number(maxResults)));
    } catch (e) {
      setMessage(`PubMed search failed: ${errMessage(e)}`);
    } finally {
      setSearching(false);
    }
  };

  const importSelected = async () => {
    if (!supabase) return;
    setImporting(true);
    setMessage('');
    const chosen = results.filter((result) => selected.includes(result.pmid) && statuses.get(result.pmid) !== 'Already Imported');
    let imported = 0;
    const failed: string[] = [];
    for (const result of chosen) {
      const { error } = await supabase.from('research_sources').insert(toSourcePayload(result, run));
      if (error) failed.push(`${result.pmid}: ${error.message}`);
      else imported += 1;
    }
    try {
      if (imported > 0) {
        const { error } = await supabase.from('research_runs').update({ status: 'needs_review', updated_at: new Date().toISOString() }).eq('id', run.id);
        if (error) throw error;
        await onImported();
      }
      setSelected([]);
      setMessage(failed.length ? `Import failed: ${imported} imported; failed ${failed.join('; ')}` : `${imported} source${imported === 1 ? '' : 's'} imported.`);
    } catch (e) {
      setMessage(`Import failed: ${errMessage(e)}`);
    } finally {
      setImporting(false);
    }
  };

  const toggle = (pmid: string) => setSelected((current) => current.includes(pmid) ? current.filter((id) => id !== pmid) : [...current, pmid]);

  return <div className="fixed inset-0 z-50 overflow-auto bg-black/40 p-6"><div className="mx-auto max-w-5xl rounded-2xl bg-white p-5 dark:bg-zinc-900"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">Find PubMed Sources</h2><p className="text-sm text-slate-500">Linked substance: {substanceName || '—'}</p></div><button className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-zinc-800" onClick={onClose}>Close</button></div>{message && <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}<div className="grid gap-2 md:grid-cols-[1fr_auto_auto]"><input className="rounded-xl border px-3 py-2 dark:bg-zinc-950" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="PubMed search query" /><select className="rounded-xl border px-3 py-2 dark:bg-zinc-950" value={maxResults} onChange={(e) => setMaxResults(e.target.value)}>{['5','10','20'].map((option) => <option key={option}>{option}</option>)}</select><button disabled={searching || importing} onClick={search} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60">{searching ? 'Searching PubMed…' : 'Search PubMed'}</button></div>{searching && <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Searching PubMed…</p>}<div className="mt-4 space-y-3">{results.map((result) => { const status = statuses.get(result.pmid) ?? 'New'; return <label key={result.pmid} className="block rounded-2xl border border-slate-200 p-4 text-sm dark:border-zinc-800"><div className="flex gap-3"><input type="checkbox" disabled={status === 'Already Imported' || importing} checked={selected.includes(result.pmid)} onChange={() => toggle(result.pmid)} /><div className="space-y-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{result.title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-zinc-800">{status}</span></div><p className="text-slate-600 dark:text-slate-300">{[result.authors, result.year, result.journal].filter(Boolean).join(' · ')}</p><p>PMID: {result.pmid}{result.doi ? ` · DOI: ${result.doi}` : ''}</p><p>Publication types: {result.publicationTypes.join(', ') || '—'}</p><p className="text-slate-600 dark:text-slate-300">{result.abstract ? `${result.abstract.slice(0, 320)}${result.abstract.length > 320 ? '…' : ''}` : 'No abstract snippet available.'}</p></div></div></label>; })}</div><div className="mt-4 flex gap-2"><button disabled={importing || selected.length === 0} onClick={importSelected} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60">{importing ? 'Importing selected…' : 'Import Selected'}</button></div></div></div>;
}

function duplicateStatus(result: PubMedSourceResult, sources: Row[]): DuplicateStatus {
  const title = normalizeTitle(result.title);
  if (sources.some((source) => result.pmid && val(source.pmid) === result.pmid)) return 'Already Imported';
  if (sources.some((source) => (result.doi && val(source.doi) === result.doi) || (title && normalizeTitle(val(source.title)) === title))) return 'Possible Duplicate';
  return 'New';
}

function toSourcePayload(result: PubMedSourceResult, run: Row) {
  return { research_run_id: run.id, substance_id: run.substance_id, title: result.title, authors: result.authors || null, year: result.year, journal_or_site: result.journal || null, url: result.url, doi: result.doi || null, pmid: result.pmid, source_type: sourceType(result.publicationTypes), source_tier: 'formal_scientific', abstract: result.abstract || null, raw_metadata: result, match_status: 'possible_match', review_status: 'unreviewed', is_demo: false };
}

function sourceType(types: string[]) {
  if (types.includes('Randomized Controlled Trial') || types.includes('Clinical Trial')) return 'human_study';
  if (types.some((type) => ['Review', 'Systematic Review', 'Meta-Analysis'].includes(type))) return 'review_or_meta_analysis';
  return 'other';
}
