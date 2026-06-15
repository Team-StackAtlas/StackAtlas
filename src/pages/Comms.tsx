import { Link } from 'react-router-dom';
import { Bell, MessageSquare, Users } from 'lucide-react';
import Notifications from './Notifications';

export default function Comms() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center gap-2 text-slate-500 dark:text-zinc-400">
          <Bell size={18} />
          <span className="text-xs font-bold uppercase tracking-[0.18em]">Comms</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100">Comms</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Notifications are live here. Messages and Quarters are shown as coming-later surfaces only.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link to="/notifications" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">Notifications</Link>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"><MessageSquare size={16} className="mb-1" />Messages coming later</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"><Users size={16} className="mb-1" />Quarters coming later</div>
        </div>
      </section>
      <Notifications />
    </div>
  );
}
