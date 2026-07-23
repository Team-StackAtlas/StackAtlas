import { useState } from 'react';
import { AtSign, Bell, BookMarked, Heart, MessageCircle, Settings, UserPlus, type LucideIcon } from 'lucide-react';
import { useNotifications, type NotificationCategory } from '../hooks/useNotifications';
import { usePageMeta } from '../hooks/usePageMeta';

// Colored type badge per category, x.com-style, shown on the actor avatar.
const CATEGORY_BADGES: Record<NotificationCategory, { Icon: LucideIcon; className: string }> = {
  likes: { Icon: Heart, className: 'bg-pink-500' },
  comments: { Icon: MessageCircle, className: 'bg-blue-500' },
  follows: { Icon: UserPlus, className: 'bg-emerald-500' },
  mentions: { Icon: AtSign, className: 'bg-violet-500' },
  albums: { Icon: BookMarked, className: 'bg-amber-500' },
};

function timestampLabel(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export default function Notifications() {
  usePageMeta('Notifications');
  const { notifications, unreadCount, settings, setSettings, markAllRead, openNotification } = useNotifications();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const rows = tab === 'unread' ? notifications.filter((n) => !n.readAt) : notifications;
  const labels = { likes: 'Likes', comments: 'Comments and replies', follows: 'Follows and follow requests', mentions: 'Mentions', albums: 'Public album updates' } as const;
  return <div className="mx-auto max-w-3xl space-y-4 p-4">
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
      <div className="flex items-center gap-2">
        <button onClick={markAllRead} className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600">Mark all read</button>
        <button onClick={() => setShowSettings((v) => !v)} aria-label="Notification settings" aria-expanded={showSettings} className={`rounded-full border p-2 transition-colors ${showSettings ? 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}>
          <Settings size={16} />
        </button>
      </div>
    </div>
    <div className="flex gap-2">{(['all','unread'] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === item ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{item === 'all' ? 'All' : 'Unread'}{item === 'unread' && unreadCount > 0 && <span className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${tab === 'unread' ? 'bg-white/20 text-white dark:bg-zinc-950/15 dark:text-zinc-950' : 'bg-emerald-500 text-white'}`}>{unreadCount}</span>}</button>)}</div>
    {showSettings && (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="mb-3 font-bold">What you get notified about</h2><div className="grid gap-2 sm:grid-cols-2">{Object.entries(labels).map(([key,label]) => <label key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-zinc-950/50"><input type="checkbox" checked={settings[key as keyof typeof settings]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} className="accent-emerald-500"/>{label}</label>)}</div></section>
    )}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {rows.length ? rows.map((n) => {
        const badge = CATEGORY_BADGES[n.category as NotificationCategory];
        return (
          <button key={n.id} onClick={() => openNotification(n)} className={`flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-950 ${!n.readAt ? 'bg-emerald-50/40 dark:bg-emerald-500/[0.04]' : ''}`}>
            <span className="relative shrink-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{(n.metadata?.actorUsername as string | undefined)?.[0]?.toUpperCase() ?? '@'}</span>
              {badge && (
                <span className={`absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white text-white dark:border-zinc-900 ${badge.className}`}>
                  <badge.Icon size={9} strokeWidth={2.75} />
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block ${!n.readAt ? 'font-bold' : 'font-medium'}`}>{n.title}</span>
              {n.body && <span className="block truncate text-sm text-slate-500 dark:text-zinc-400">{n.body}</span>}
              <span className="text-xs text-slate-400 dark:text-zinc-500">{timestampLabel(n.createdAt)}</span>
            </span>
            {!n.readAt && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />}
          </button>
        );
      }) : (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800"><Bell size={20} className="text-slate-400 dark:text-zinc-500" /></div>
          <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">{tab === 'unread' ? 'All caught up' : 'No notifications yet'}</p>
          <p className="max-w-xs text-xs text-slate-500 dark:text-zinc-500">{tab === 'unread' ? 'You have no unread notifications.' : 'Likes, replies, follows, and mentions will show up here.'}</p>
        </div>
      )}
    </section>
  </div>;
}
