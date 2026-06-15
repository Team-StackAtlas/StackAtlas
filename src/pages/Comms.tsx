import { MessageSquare, Users } from 'lucide-react';

export default function Comms() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center gap-2 text-slate-500 dark:text-zinc-400">
          <MessageSquare size={18} />
          <span className="text-xs font-bold uppercase tracking-[0.18em]">Comms</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100">Comms</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Messages and Quarters will live here later. Notifications are available from their own sidebar tab.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <MessageSquare size={18} className="mb-2" />
            <h2 className="font-semibold text-slate-700 dark:text-zinc-200">Messages</h2>
            <p className="mt-1">Coming later. Direct messages are not enabled yet.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <Users size={18} className="mb-2" />
            <h2 className="font-semibold text-slate-700 dark:text-zinc-200">Quarters</h2>
            <p className="mt-1">Coming later. Quarter spaces are not enabled yet.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
