import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AlertTriangle, Info, Loader2, Upload } from 'lucide-react';
import {
  ENTITY_ORDER,
  fetchExistingKeys,
  parseDataPackJson,
  parseSourcesCsv,
  runImport,
  validatePack,
  type DataPack,
  type EntityKind,
  type ImportRunResult,
  type PackValidationReport,
  type RowIssue,
} from '../../services/import';
import Badge from './Badge';
import { entityLabel } from './adminLabels';
import ImportPreviewTable, { type PreviewFilter } from './ImportPreviewTable';

type Step = 'load' | 'review' | 'execute';
const STEP_ORDER: Step[] = ['load', 'review', 'execute'];
const STEP_LABELS: Record<Step, string> = { load: 'Load', review: 'Review', execute: 'Import' };

function entityCount(pack: DataPack, entity: EntityKind): number {
  switch (entity) {
    case 'substances':
      return pack.substances?.length ?? 0;
    case 'brands':
      return pack.brands?.length ?? 0;
    case 'stacks':
      return pack.stacks?.length ?? 0;
    case 'sources':
      return pack.sources?.length ?? 0;
    case 'findings':
      return pack.findings?.length ?? 0;
    default:
      return 0;
  }
}

function isSourcesOnlyPack(pack: DataPack): boolean {
  return !(pack.substances?.length || pack.brands?.length || pack.stacks?.length || pack.findings?.length);
}

export default function ImportWizard({
  client,
  isOwner,
}: {
  client: SupabaseClient | null;
  isOwner: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('load');
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [pastedFormat, setPastedFormat] = useState<'json' | 'csv'>('json');
  const [loadSourceLabel, setLoadSourceLabel] = useState('');
  const [pack, setPack] = useState<DataPack | null>(null);
  const [loadIssues, setLoadIssues] = useState<RowIssue[]>([]);

  const [report, setReport] = useState<PackValidationReport | null>(null);
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState('');
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('all');

  const [importing, setImporting] = useState(false);
  const [runResult, setRunResult] = useState<ImportRunResult | null>(null);
  const [runError, setRunError] = useState('');

  const resetAll = () => {
    setStep('load');
    setPastedText('');
    setLoadSourceLabel('');
    setPack(null);
    setLoadIssues([]);
    setReport(null);
    setValidateError('');
    setPreviewFilter('all');
    setImporting(false);
    setRunResult(null);
    setRunError('');
  };

  const applyParseResult = (result: { pack: DataPack | null; issues: RowIssue[] }, label: string) => {
    setPack(result.pack);
    setLoadIssues(result.issues);
    setLoadSourceLabel(label);
    setReport(null);
    setRunResult(null);
    setRunError('');
    setValidateError('');
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.json')) {
      applyParseResult(parseDataPackJson(text), `file "${file.name}"`);
    } else if (lower.endsWith('.csv')) {
      applyParseResult(parseSourcesCsv(text), `file "${file.name}"`);
    } else {
      setPack(null);
      setLoadIssues([
        { path: '', message: 'Unsupported file type — use a .json or .csv file.', severity: 'error' },
      ]);
      setLoadSourceLabel(`file "${file.name}"`);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const handleParsePasted = () => {
    if (!pastedText.trim()) return;
    const result = pastedFormat === 'json' ? parseDataPackJson(pastedText) : parseSourcesCsv(pastedText);
    applyParseResult(result, `pasted ${pastedFormat === 'json' ? 'JSON' : 'CSV'}`);
  };

  const goToReview = async () => {
    if (!pack) return;
    setStep('review');
    if (!client) {
      setValidateError('Backend not configured — cannot check existing records against this pack.');
      return;
    }
    setValidating(true);
    setValidateError('');
    try {
      const existing = await fetchExistingKeys(client);
      setReport(validatePack(pack, existing));
    } catch (err) {
      console.error('Validate data pack failed', err);
      setValidateError(err instanceof Error ? err.message : 'Failed to validate this pack.');
    } finally {
      setValidating(false);
    }
  };

  const sourcesOnly = pack ? isSourcesOnlyPack(pack) : false;
  const canExecute = !!report?.ok && (isOwner || sourcesOnly);

  const runTheImport = async () => {
    if (!client || !pack || !report || !canExecute || importing) return;
    setImporting(true);
    setRunError('');
    try {
      setRunResult(await runImport(client, pack, report));
    } catch (err) {
      console.error('Run import failed', err);
      setRunError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {!isOwner && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          <Info size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Data pack import is owner-only</p>
            <p className="mt-1">
              Site admins can still import CSV files that contain only research sources. The Import
              step unlocks once your loaded pack contains sources and nothing else — anything with
              substances, brands, stacks, or findings needs a site owner.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        {STEP_ORDER.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === s
                  ? 'bg-emerald-600 text-white'
                  : STEP_ORDER.indexOf(step) > i
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-400 dark:bg-zinc-800'
              }`}
            >
              {i + 1}
            </span>
            <span className={step === s ? 'font-semibold' : 'text-slate-500'}>{STEP_LABELS[s]}</span>
            {i < STEP_ORDER.length - 1 && <span className="text-slate-300 dark:text-zinc-700">—</span>}
          </div>
        ))}
      </div>

      {step === 'load' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                : 'border-slate-200 dark:border-zinc-700'
            }`}
          >
            <Upload className="mx-auto text-slate-400" size={28} />
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
              Drag a .json or .csv file here, or
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              Choose file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Or paste directly</p>
              <div className="flex gap-1">
                {(['json', 'csv'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPastedFormat(f)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      pastedFormat === f
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {f === 'json' ? 'JSON pack' : 'CSV sources'}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={8}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
              placeholder={
                pastedFormat === 'json'
                  ? '{ "kind": "stackatlas-data-pack", "schema_version": 1, ... }'
                  : 'title,source_type,url,pmid,doi,year,journal_or_site,authors,abstract,substances'
              }
            />
            <button
              onClick={handleParsePasted}
              disabled={!pastedText.trim()}
              className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              Parse
            </button>
          </div>

          {loadSourceLabel && (
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
              <p className="text-sm text-slate-500">Parsed from {loadSourceLabel}</p>
              {pack ? (
                <>
                  <div className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
                    <p>
                      <span className="text-slate-500">Label: </span>
                      {pack.label ?? '—'}
                    </p>
                    <p>
                      <span className="text-slate-500">Generated by: </span>
                      {pack.generated_by ?? '—'}
                    </p>
                    <p>
                      <span className="text-slate-500">Schema version: </span>
                      {pack.schema_version}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ENTITY_ORDER.filter((entity) => entityCount(pack, entity) > 0).map((entity) => (
                      <Badge key={entity} tone="slate">
                        {entityLabel(entity)}: {entityCount(pack, entity)}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                  Could not read a data pack from this input.
                </p>
              )}
              {loadIssues.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs">
                  {loadIssues.map((issue, i) => (
                    <li
                      key={i}
                      className={
                        issue.severity === 'error'
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }
                    >
                      {issue.path ? `${issue.path}: ` : ''}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={resetAll}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold dark:bg-zinc-800"
                >
                  Clear
                </button>
                <button
                  onClick={() => void goToReview()}
                  disabled={!pack}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Continue to Review
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          {validating && <LoadingBlock text="Checking existing records…" />}
          {validateError && <ErrorBlock text={validateError} onRetry={() => void goToReview()} />}
          {report && !validating && (
            <>
              <ImportPreviewTable report={report} filter={previewFilter} onFilterChange={setPreviewFilter} />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setStep('load')}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold dark:bg-zinc-800"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('execute')}
                  disabled={!report.ok}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Continue to Import
                </button>
                {!report.ok && (
                  <span className="text-xs text-slate-500">
                    Fix invalid rows or add at least one importable row before continuing.
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {step === 'execute' && report && (
        <div className="space-y-4">
          {!runResult && (
            <>
              <p className="text-sm text-slate-600 dark:text-zinc-400">
                Ready to add {report.rows.filter((r) => r.status === 'ready').length} new row(s) and
                update {report.rows.filter((r) => r.status === 'exists').length} existing row(s).
              </p>
              {!isOwner && !sourcesOnly && (
                <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  This pack includes rows other than sources. Only a site owner can import it.
                </p>
              )}
              {!client && (
                <p className="text-xs text-slate-500">Backend not configured — import is unavailable.</p>
              )}
              {runError && <ErrorBlock text={runError} onRetry={() => void runTheImport()} />}
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('review')}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold dark:bg-zinc-800"
                >
                  Back
                </button>
                <button
                  onClick={() => void runTheImport()}
                  disabled={!canExecute || importing || !client}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {importing && <Loader2 size={14} className="animate-spin" />}
                  {importing ? 'Importing…' : 'Import'}
                </button>
              </div>
            </>
          )}

          {runResult && (
            <div className="space-y-3">
              <div
                className={`rounded-xl border p-3 text-sm font-semibold ${
                  runResult.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                }`}
              >
                {runResult.ok ? 'Import completed.' : 'Import completed with errors.'} Batch{' '}
                {runResult.batchId}.
              </div>
              {runResult.results.map((r) => (
                <div key={r.entity} className="rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
                  <p className="font-bold">{entityLabel(r.entity)}</p>
                  <p className="text-sm text-slate-600 dark:text-zinc-400">
                    Attempted {r.attempted} · Inserted {r.inserted} · Updated {r.updated} · Skipped{' '}
                    {r.skipped}
                  </p>
                  {r.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-red-700 dark:text-red-400">
                      {r.errors.map((e, i) => (
                        <li key={i}>
                          Row {e.index + 1}: {e.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.warnings.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-400">
                      {r.warnings.map((w, i) => (
                        <li key={i}>
                          Row {w.index + 1}: {w.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <button
                onClick={resetAll}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
              >
                Start over
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingBlock({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
      <Loader2 size={16} className="animate-spin" />
      {text}
    </div>
  );
}

function ErrorBlock({ text, onRetry }: { text: ReactNode; onRetry: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
      <span>{text}</span>
      <button
        onClick={onRetry}
        className="shrink-0 rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold dark:bg-red-500/20"
      >
        Retry
      </button>
    </div>
  );
}
