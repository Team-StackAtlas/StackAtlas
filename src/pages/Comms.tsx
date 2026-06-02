import { useEffect, useState } from 'react';
import { AtSign, Bell, CheckCircle, ChevronRight, Circle, Info, MessageSquare, ShieldCheck, Star, ThumbsUp, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { MockCommsItem, useMockComms } from '../hooks/useMockComms';

type CommsTab = 'Notifications' | 'Direct Messages' | 'Quarters';

function itemIcon(item: MockCommsItem) {
  if (item.kind === 'dm') return <MessageSquare size={18} className="text-blue-500" />;
  if (item.iconType === 'mention') return <AtSign size={18} className="text-purple-500" />;
  if (item.iconType === 'gold') return <Star size={18} className="text-amber-500" />;
  if (item.iconType === 'helpful') return <ThumbsUp size={18} className="text-emerald-500" />;
  if (item.iconType === 'status') return <ShieldCheck size={18} className="text-indigo-500" />;
  if (item.iconType === 'quarter') return <Users size={18} className="text-emerald-500" />;
  if (item.iconType === 'reply') return <MessageSquare size={18} className="text-sky-500" />;
  return <Info size={18} className="text-slate-500" />;
}

function CommsRow({ item, unread, onOpen }: { item: MockCommsItem; unread: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'w-full rounded-2xl border p-4 text-left transition-colors hover:border-emerald-300 dark:hover:border-emerald-500/40',
        unread
          ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10'
          : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-zinc-950/60">
          {itemIcon(item)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            {unread ? <Circle size={8} className="fill-red-500 text-red-500" /> : <CheckCircle size={13} className="text-slate-400 dark:text-zinc-600" />}
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">{item.label}</span>
            <span className="text-xs text-slate-400 dark:text-zinc-600">• {formatDistanceToNow(new Date(item.timestamp))} ago</span>
          </div>
          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-zinc-100">{item.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">{item.preview}</p>
        </div>
        <ChevronRight size={16} className="mt-2 text-slate-400 dark:text-zinc-600" />
      </div>
    </button>
  );
}

export default function Comms() {
  const [activeTab, setActiveTab] = useState<CommsTab>('Notifications');
  const {
    notifications,
    directMessages,
    quarterUpdates,
    isUnread,
    markItemRead,
    markInboxViewed,
  } = useMockComms();

  useEffect(() => {
    markInboxViewed();
  }, [markInboxViewed]);

  const tabs: { name: CommsTab; count: number }[] = [
    { name: 'Notifications', count: notifications.filter(isUnread).length },
    { name: 'Direct Messages', count: directMessages.filter(isUnread).length },
    { name: 'Quarters', count: quarterUpdates.filter(isUnread).length },
  ];

  const activeItems = activeTab === 'Notifications'
    ? notifications
    : activeTab === 'Direct Messages'
      ? directMessages
      : quarterUpdates;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-slate-50 px-4 pb-24 pt-6 text-slate-900 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-50 md:pb-8">
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-zinc-400">
          <Bell size={18} />
          <span className="text-xs font-bold uppercase tracking-[0.18em]">Mock Comms</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100">Comms</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Local mock notifications, direct messages, and Quarter updates for demo workflows. No real messaging or backend is connected.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            type="button"
            onClick={() => setActiveTab(tab.name)}
            className={cn(
              'relative rounded-xl px-2 py-2 text-xs font-bold transition-colors sm:text-sm',
              activeTab === tab.name
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
            )}
          >
            {tab.name}
            {tab.count > 0 && (
              <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
        {activeTab === 'Notifications' && 'Substance updates, status changes, replies, Helpful activity, and followed Gold Dispatch activity.'}
        {activeTab === 'Direct Messages' && 'Mock conversation previews only. Message sending is intentionally not implemented yet.'}
        {activeTab === 'Quarters' && 'Updates from followed Quarters, including mentions and activity summaries.'}
      </div>

      <div className="space-y-3">
        {activeItems.map((item) => (
          <CommsRow
            key={item.id}
            item={item}
            unread={isUnread(item)}
            onOpen={() => markItemRead(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
