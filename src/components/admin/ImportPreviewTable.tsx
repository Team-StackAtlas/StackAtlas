import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ENTITY_ORDER, type PackValidationReport, type ValidatedRow } from '../../services/import';
import Badge from './Badge';
import { entityLabel, rowStatusLabel, rowStatusTone } from './adminLabels';

const MAX_VISIBLE_ROWS = 200;

export type PreviewFilter = 'all' | 'problems';

function isProblemRow(row: ValidatedRow): boolean {
  return row.status !== 'ready' && row.status !== 'exists';
}

export default function ImportPreviewTable({
  report,
  filter,
  onFilterChange,
}: {
  report: PackValidationReport;
  filter: PreviewFilter;
  onFilterChange: (filter: PreviewFilter) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const orderedRows = useMemo(() => {
    const byEntity = new Map<string, ValidatedRow[]>();
    for (const row of report.rows) {
      const list = byEntity.get(row.entity) ?? [];
      list.push(row);
      byEntity.set(row.entity, list);
    }
    const rows: ValidatedRow[] = [];
    for (const entity of ENTITY_ORDER) {
      for (const row of (byEntity.get(entity) ?? []).sort((a, b) => a.index - b.index)) {
        rows.push(row);
      }
    }
    return rows;
  }, [report.rows]);

  const filteredRows = useMemo(
    () => (filter === 'problems' ? orderedRows.filter(isProblemRow) : orderedRows),
    [orderedRows, filter],
  );
  const visibleRows = filteredRows.slice(0, MAX_VISIBLE_ROWS);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const activeEntities = ENTITY_ORDER.filter((entity) => report.counts[entity]?.total);

  return (
    <div className="space-y-4">
      {report.packIssues.length > 0 && (
        <div className="space-y-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <p className="font-semibold">Pack-level problems</p>
          {report.packIssues.map((issue, i) => (
            <p key={i}>
              {issue.path ? `${issue.path}: ` : ''}
              {issue.message}
            </p>
          ))}
        </div>
      )}

      {activeEntities.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
          This pack has no rows to import.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeEntities.map((entity) => {
            const counts = report.counts[entity];
            return (
              <div
                key={entity}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-sm font-bold">{entityLabel(entity)}</p>
                <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-slate-600 dark:text-zinc-400">
                  <dt>Total</dt>
                  <dd className="text-right font-semibold">{counts.total}</dd>
                  <dt className="text-emerald-700 dark:text-emerald-400">Ready</dt>
                  <dd className="text-right font-semibold text-emerald-700 dark:text-emerald-400">
                    {counts.ready}
                  </dd>
                  <dt className="text-blue-700 dark:text-blue-400">Will update</dt>
                  <dd className="text-right font-semibold text-blue-700 dark:text-blue-400">
                    {counts.exists}
                  </dd>
                  <dt className="text-amber-700 dark:text-amber-400">Duplicates</dt>
                  <dd className="text-right font-semibold text-amber-700 dark:text-amber-400">
                    {counts.duplicates}
                  </dd>
                  <dt className="text-red-700 dark:text-red-400">Invalid</dt>
                  <dd className="text-right font-semibold text-red-700 dark:text-red-400">
                    {counts.invalid}
                  </dd>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        {(['all', 'problems'] as PreviewFilter[]).map((value) => (
          <button
            key={value}
            onClick={() => onFilterChange(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === value
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
          >
            {value === 'all' ? 'All rows' : 'Problems only'}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-zinc-800">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Summary</th>
                <th className="px-3 py-2">Natural key</th>
                <th className="px-3 py-2">Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {visibleRows.map((row) => {
                const key = `${row.entity}-${row.index}`;
                const isExpanded = expanded.has(key);
                return (
                  <Fragment key={key}>
                    <tr>
                      <td className="px-3 py-2 text-xs text-slate-500">{entityLabel(row.entity)}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{row.index + 1}</td>
                      <td className="px-3 py-2">
                        <Badge tone={rowStatusTone(row.status)}>{rowStatusLabel(row.status)}</Badge>
                      </td>
                      <td className="max-w-xs px-3 py-2 font-medium">{row.summary || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">
                        {row.naturalKey ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {row.issues.length > 0 ? (
                          <button
                            onClick={() => toggle(key)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-zinc-300"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {row.issues.length} issue{row.issues.length === 1 ? '' : 's'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && row.issues.length > 0 && (
                      <tr className="bg-slate-50 dark:bg-zinc-950">
                        <td colSpan={6} className="px-3 py-2">
                          <ul className="space-y-1 text-xs">
                            {row.issues.map((issue, i) => (
                              <li
                                key={i}
                                className={
                                  issue.severity === 'error'
                                    ? 'text-red-700 dark:text-red-400'
                                    : 'text-amber-700 dark:text-amber-400'
                                }
                              >
                                <span className="font-mono">{issue.path || '(row)'}</span>:{' '}
                                {issue.message}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                    {filter === 'problems' ? 'No problem rows — everything looks clean.' : 'No rows to show.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {filteredRows.length > MAX_VISIBLE_ROWS && (
        <p className="text-xs text-slate-500">
          Showing {visibleRows.length} of {filteredRows.length} rows.
        </p>
      )}
    </div>
  );
}
