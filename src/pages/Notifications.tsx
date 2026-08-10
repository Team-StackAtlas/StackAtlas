import { useState } from 'react';
import { AtSign, Bell, BookMarked, Heart, MessageCircle, Settings, UserPlus, type LucideIcon } from 'lucide-react';
import { useNotifications, type NotificationCategory } from '../hooks/useNotifications';
import { usePageMeta } from '../hooks/usePageMeta';
import { EmptyState } from '../components/EmptyState';
import { ACCENTS } from '../components/ui/accents';
import { cn } from '../lib/utils';

// Colored type badge per category, x.com-style, shown on the actor avatar.
const CATEGORY_BADGES: Record<NotificationCategory, { Icon: LucideIcon; className: string }> = {
  likes: { Icon: Heart, className: 'bg-pink-500' },
  comments: { Icon: MessageCircle, className: 'bg-blue-500' },
  follows: { Icon: UserPlus, className: 'bg-emerald-500' },
  mentions: { Icon: AtSign, className: 'bg-violet-500' },
  albums: { Icon: BookMarked, className: 'bg-amber-500' },
};

// Deterministic vibrant avatar color per actor (full literals so Tailwind keeps them).
const AVATAR_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-600',
  'bg-teal-500', 'bg-sky-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500',
];

function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function exactTime(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

/** Reddit-style day buckets; rows arrive sorted newest-first. */
function bucketLabel(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return 'This week';
  return 'Earlier';
}

/** Splits "@handle did a thing" so the actor renders bold like x.com. */
function splitTitle(title: string): { handle: string | null; rest: string } {
  const match = title.match(/^(@\S+)\s+(.*)$/);
  return match ? { handle: match[1], rest: match[2] } : { handle: null, rest: title };
}

export default function Notifications() {
  usePageMeta('Notifications');
  const { notifications, unreadCount, settings, setSettings, markAllRead, openNotification } = useNotifications();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const rows = tab === 'unread' ? notifications.filter((n) => !n.readAt) : notifications;
  const labels = { likes: 'Likes', comments: 'Comments and replies', follows: 'Follows and follow requests', mentions: 'Mentions', albums: 'Public album updates' } as const;
  let lastBucket = '';
  return <div className="mx-auto max-w-3xl space-y-4 p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={cn(ACCENTS.amber.iconTile, 'mb-0 h-11 w-11 shrink-0')}>
          <Bell size={20} className="text-white" />
        </span>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Notifications</h1>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={markAllRead} className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">Mark all read</button>
        <button onClick={() => setShowSettings((v) => !v)} aria-label="Notification settings" aria-expanded={showSettings} className={`rounded-full border p-2 transition-colors ${showSettings ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}>
          <Settings size={16} />
        </button>
      </div>
    </div>
    <div className="flex gap-2">{(['all','unread'] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === item ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{item === 'all' ? 'All' : 'Unread'}{item === 'unread' && unreadCount > 0 && <span className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${tab === 'unread' ? 'bg-white/20 text-white dark:bg-zinc-950/15 dark:text-zinc-950' : 'bg-emerald-700 text-white'}`}>{unreadCount}</span>}</button>)}</div>
    {showSettings && (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="mb-3 font-bold">What you get notified about</h2><div className="grid gap-2 sm:grid-cols-2">{Object.entries(labels).map(([key,label]) => <label key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-zinc-950/50"><input type="checkbox" checked={settings[key as keyof typeof settings]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} className="accent-emerald-500"/>{label}</label>)}</div></section>
    )}
    {rows.length ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {rows.map((n) => {
        const badge = CATEGORY_BADGES[n.category as NotificationCategory];
        const actor = (n.metadata?.actorUsername as string | undefined) ?? '';
        const { handle, rest } = splitTitle(n.title);
        const bucket = bucketLabel(n.createdAt);
        const header = bucket !== lastBucket ? bucket : null;
        lastBucket = bucket;
        return (
          <div key={n.id}>
            {header && (
              <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                {header}
              </div>
            )}
            <button onClick={() => openNotification(n)} className={`relative flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-950 ${!n.readAt ? 'bg-emerald-50/40 dark:bg-emerald-500/[0.04]' : ''}`}>
              {!n.readAt && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500" />}
              <span className="relative shrink-0">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-white ${actor ? avatarColor(actor) : 'bg-slate-400 dark:bg-zinc-700'}`}>{actor[0]?.toUpperCase() ?? '@'}</span>
                {badge && (
                  <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-white dark:border-zinc-900 ${badge.className}`}>
                    <badge.Icon size={10} strokeWidth={2.75} />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={`min-w-0 text-[15px] ${!n.readAt ? 'text-slate-900 dark:text-zinc-50' : 'text-slate-700 dark:text-zinc-300'}`}>
                    {handle ? <><span className="font-bold">{handle}</span> <span className={!n.readAt ? 'font-medium' : ''}>{rest}</span></> : <span className={!n.readAt ? 'font-semibold' : ''}>{rest}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <time title={exactTime(n.createdAt)} className="text-xs tabular-nums text-slate-500 dark:text-zinc-500">{relativeTime(n.createdAt)}</time>
                    {!n.readAt && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                  </span>
                </span>
                {n.body && (
                  <span className="mt-1.5 block truncate rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm text-slate-500 dark:bg-zinc-950/60 dark:text-zinc-400">{n.body}</span>
                )}
              </span>
            </button>
          </div>
        );
      })}
    </section> : (
      <EmptyState
        icon={Bell}
        accent="amber"
        title={tab === 'unread' ? 'All caught up' : 'No notifications yet'}
        description={tab === 'unread' ? 'You have no unread notifications.' : 'Likes, replies, follows, and mentions will show up here.'}
      />
    )}
  </div>;
}
