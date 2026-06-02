import { useState } from 'react';
import { Eye, EyeOff, FileText, GitMerge, Pencil } from 'lucide-react';
import { MockReportTargetType, useMockRole } from '../context/MockRoleContext';

interface AdminObjectActionsProps {
  targetType: MockReportTargetType;
  targetId?: string;
  targetName: string;
}

export function AdminObjectActions({ targetType, targetId, targetName }: AdminObjectActionsProps) {
  const { isAdminLike, getReportsForTarget } = useMockRole();
  const [isViewingReports, setIsViewingReports] = useState(false);

  if (!isAdminLike) return null;

  const targetReports = getReportsForTarget(targetType, targetId, targetName);
  const openTargetReports = targetReports.filter((report) => report.status === 'open');

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Admin object actions</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Mock controls for platform content review.</p>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-zinc-900 dark:text-emerald-300">
          {openTargetReports.length} open
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
          <Pencil size={13} /> Edit
        </button>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
          <EyeOff size={13} /> Hide
        </button>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
          <GitMerge size={13} /> Merge Duplicate
        </button>
        <button
          type="button"
          onClick={() => setIsViewingReports((isOpen) => !isOpen)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
        >
          <Eye size={13} /> View Reports
        </button>
      </div>

      {isViewingReports && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
          {openTargetReports.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-zinc-400">No open reports.</p>
          ) : (
            <div className="space-y-3">
              {openTargetReports.map((report) => (
                <div key={report.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-zinc-100">
                      <FileText size={13} /> {report.category}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">{report.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">{new Date(report.createdAt).toLocaleString()}</p>
                  {report.details ? (
                    <p className="mt-2 text-sm text-slate-700 dark:text-zinc-300">{report.details}</p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500 dark:text-zinc-500">No additional details provided.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
