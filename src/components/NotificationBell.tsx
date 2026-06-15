import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, openNotification } = useNotifications();
  const recent = notifications.slice(0, 6);
  return <div className="relative">
    <button onClick={() => setOpen((v) => !v)} className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700" aria-label="Notifications">
      <Bell size={18} />
      {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>}
    </button>
    {open && <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-zinc-800"><strong>Notifications</strong><button onClick={markAllRead} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Mark all read</button></div>
      <div className="max-h-96 overflow-y-auto">
        {recent.length ? recent.map((n) => <button key={n.id} onClick={() => openNotification(n)} className="flex w-full gap-3 border-b border-slate-100 p-3 text-left hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-950">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{(n.metadata?.actorUsername as string | undefined)?.[0]?.toUpperCase() ?? '@'}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm text-slate-900 dark:text-zinc-100">{n.title}</span>{n.body && <span className="block truncate text-xs text-slate-500">{n.body}</span>}<span className="text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</span></span>
          {!n.readAt && <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />}
        </button>) : <p className="p-4 text-sm text-slate-500">No notifications yet.</p>}
      </div>
      <Link to="/notifications" onClick={() => setOpen(false)} className="block p-3 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">View all</Link>
    </div>}
  </div>;
}
