import { Code2, ShieldCheck } from 'lucide-react';
import { BRANDS, STACKS, SUPPLEMENTS } from '../data/mockData';
import { MOCK_REPORTS_STORAGE_KEY, MOCK_ROLE_STORAGE_KEY, MockRole, useMockRole } from '../context/MockRoleContext';
import { cn } from '../lib/utils';

const ROLE_LABELS: Record<MockRole, string> = {
  user: 'User',
  admin: 'Admin',
  developer: 'Developer',
};

export function MockRolePanels() {
  const { role, setRole, isAdminLike, isDeveloper, reports, openReports } = useMockRole();

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Mock Role</span>
          {isAdminLike && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldCheck size={11} />
              StackAtlas Staff
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-950">
          {(Object.keys(ROLE_LABELS) as MockRole[]).map((roleOption) => (
            <button
              key={roleOption}
              type="button"
              onClick={() => setRole(roleOption)}
              className={cn(
                'rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
                role === roleOption
                  ? 'bg-white text-emerald-700 shadow-sm dark:bg-zinc-800 dark:text-emerald-300'
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-zinc-200'
              )}
            >
              {ROLE_LABELS[roleOption]}
            </button>
          ))}
        </div>
      </div>

      {isAdminLike && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Admin Tools</h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-zinc-900 dark:text-emerald-300">Mock</span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-white/80 p-2 dark:bg-zinc-950/40">
              <dt className="text-slate-500 dark:text-zinc-500">Open Reports</dt>
              <dd className="text-lg font-bold text-slate-900 dark:text-zinc-100">{openReports.length}</dd>
            </div>
            <div className="rounded-xl bg-white/80 p-2 dark:bg-zinc-950/40">
              <dt className="text-slate-500 dark:text-zinc-500">Hidden Items</dt>
              <dd className="text-lg font-bold text-slate-900 dark:text-zinc-100">0</dd>
            </div>
            <div className="rounded-xl bg-white/80 p-2 dark:bg-zinc-950/40">
              <dt className="text-slate-500 dark:text-zinc-500">Pending Review</dt>
              <dd className="text-lg font-bold text-slate-900 dark:text-zinc-100">0</dd>
            </div>
            <div className="rounded-xl bg-white/80 p-2 dark:bg-zinc-950/40">
              <dt className="text-slate-500 dark:text-zinc-500">Classification Review</dt>
              <dd className="text-xs font-semibold text-slate-600 dark:text-zinc-300">Placeholder</dd>
            </div>
          </dl>
        </div>
      )}

      {isDeveloper && (
        <div className="rounded-2xl border border-slate-300 bg-slate-100 p-3 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <div className="mb-2 flex items-center gap-2 text-slate-900 dark:text-zinc-100">
            <Code2 size={14} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold">Developer Panel</h3>
          </div>
          <dl className="space-y-1.5 text-slate-600 dark:text-zinc-400">
            <div className="flex justify-between gap-3"><dt>current role</dt><dd className="font-mono text-slate-900 dark:text-zinc-100">{role}</dd></div>
            <div className="flex justify-between gap-3"><dt>role key</dt><dd className="font-mono text-slate-900 dark:text-zinc-100">{MOCK_ROLE_STORAGE_KEY}</dd></div>
            <div className="flex justify-between gap-3"><dt>reports key</dt><dd className="font-mono text-slate-900 dark:text-zinc-100">{MOCK_REPORTS_STORAGE_KEY}</dd></div>
            <div className="flex justify-between gap-3"><dt>mock reports</dt><dd className="font-mono text-slate-900 dark:text-zinc-100">{reports.length}</dd></div>
            <div className="flex justify-between gap-3"><dt>open reports</dt><dd className="font-mono text-slate-900 dark:text-zinc-100">{openReports.length}</dd></div>
            <div className="flex justify-between gap-3"><dt>environment</dt><dd className="font-mono text-slate-900 dark:text-zinc-100">Mock Frontend</dd></div>
            <div className="flex justify-between gap-3"><dt>runtime note</dt><dd className="font-mono text-slate-900 dark:text-zinc-100">No backend connected</dd></div>
            <div className="flex justify-between gap-3"><dt>substances</dt><dd className="font-mono text-slate-900 dark:text-zinc-100">{SUPPLEMENTS.length}</dd></div>
            <div className="flex justify-between gap-3"><dt>stacks</dt><dd className="font-mono text-slate-900 dark:text-zinc-100">{STACKS.length}</dd></div>
            <div className="flex justify-between gap-3"><dt>brands</dt><dd className="font-mono text-slate-900 dark:text-zinc-100">{BRANDS.length}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
