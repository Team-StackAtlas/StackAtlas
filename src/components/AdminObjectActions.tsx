import { EyeOff, GitMerge, Pencil } from 'lucide-react';
import type { MockReportTargetType } from '../context/MockRoleContext';
import { useAuth } from '../context/AuthContext';

interface AdminObjectActionsProps {
  targetType: MockReportTargetType;
  targetId?: string;
  targetName: string;
}

export function AdminObjectActions({ targetType, targetId, targetName }: AdminObjectActionsProps) {
  const { user } = useAuth();
  const isAdminLike = user?.role === 'Admin' || user?.role === 'Developer';

  if (!isAdminLike) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Admin object actions</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Supabase role: {user?.role}. Target: {targetType}/{targetId ?? targetName}.
          </p>
        </div>
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
      </div>
    </div>
  );
}
