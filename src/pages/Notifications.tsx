import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

export default function Notifications() {
  const { notifications, settings, setSettings, markAllRead, openNotification } = useNotifications();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const rows = tab === 'unread' ? notifications.filter((n) => !n.readAt) : notifications;
  const labels = { likes: 'Likes', comments: 'Comments and replies', follows: 'Follows and follow requests', mentions: 'Mentions', albums: 'Public album updates' } as const;
  return <div className="mx-auto max-w-3xl space-y-5 p-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Notifications</h1><button onClick={markAllRead} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white">Mark all read</button></div>
    <div className="flex gap-2">{(['all','unread'] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === item ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-slate-100 dark:bg-zinc-800'}`}>{item === 'all' ? 'All' : 'Unread'}</button>)}</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="mb-3 font-bold">Settings</h2><div className="grid gap-2 sm:grid-cols-2">{Object.entries(labels).map(([key,label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings[key as keyof typeof settings]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}/>{label}</label>)}</div></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">{rows.length ? rows.map((n) => <button key={n.id} onClick={() => openNotification(n)} className="flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-950"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold dark:bg-zinc-800">{(n.metadata?.actorUsername as string | undefined)?.[0]?.toUpperCase() ?? '@'}</span><span className="flex-1"><span className="block font-semibold">{n.title}</span>{n.body && <span className="block text-sm text-slate-500">{n.body}</span>}<span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span></span>{!n.readAt && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}</button>) : <p className="p-8 text-center text-sm text-slate-500">No notifications.</p>}</section>
  </div>;
}
