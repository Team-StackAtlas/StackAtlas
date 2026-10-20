import { useMemo, useState, type MouseEvent } from 'react';
import { AtSign, Bell, BookMarked, Check, FlaskConical, Heart, MessageCircle, Radio, Settings, UserPlus, X, type LucideIcon } from 'lucide-react';
import { useNotifications, type NotificationCategory } from '../hooks/useNotifications';
import { useAuth } from '../context/AuthContext';
import { useFollowing } from '../hooks/useFollowing';
import { usePosts } from '../context/PostsContext';
import { useToast } from '../components/ui/ToastProvider';
import { usePageMeta } from '../hooks/usePageMeta';
import { EmptyState } from '../components/EmptyState';
import { ACCENTS } from '../components/ui/accents';
import { cn } from '../lib/utils';
import type { NotificationDTO } from '../services/types';

/**
 * Notifications, rebuilt around what a reader actually wants to know: who,
 * did what, to which of my things, and what can I do about it right here.
 * Likes and follows on the same target collapse into one row ("@a, @b and 2
 * others"), posts show their title as context, and follow requests, new
 * followers, and replies carry inline actions.
 */

const CATEGORY_META: Record<NotificationCategory, { Icon: LucideIcon; label: string; badge: string; description: string }> = {
  mentions: { Icon: AtSign, label: 'Mentions', badge: 'bg-violet-500', description: 'Someone tags you in a post or comment.' },
  comments: { Icon: MessageCircle, label: 'Replies', badge: 'bg-blue-500', description: 'Comments on your posts and replies to your comments.' },
  follows: { Icon: UserPlus, label: 'Follows', badge: 'bg-emerald-500', description: 'New followers, follow requests, and approvals.' },
  likes: { Icon: Heart, label: 'Likes', badge: 'bg-pink-500', description: 'Helpful votes on your Dispatches and Signals.' },
  albums: { Icon: BookMarked, label: 'Albums', badge: 'bg-amber-500', description: 'Public albums you follow get new items.' },
};
const CATEGORY_ORDER: NotificationCategory[] = ['mentions', 'comments', 'follows', 'likes', 'albums'];

const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
];
function avatarColor(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function relativeTime(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function exactTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}
function bucketLabel(iso: string) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);
  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return 'This week';
  return 'Earlier';
}
/** "@handle did a thing" → bold actor + plain rest. */
function splitTitle(title: string) {
  const m = title.match(/^(@\S+)\s+(.*)$/);
  return m ? { handle: m[1], rest: m[2] } : { handle: null, rest: title };
}
function actorOf(n: NotificationDTO) {
  return (n.metadata?.actorUsername as string | undefined) ?? splitTitle(n.title).handle?.slice(1) ?? '';
}

/** One rendered row: a single notification, or several of the same kind on the same target. */
interface Group {
  id: string;
  kind: string;
  category: NotificationCategory;
  items: NotificationDTO[];
  actors: string[];
  latest: NotificationDTO;
  unread: boolean;
}
const GROUPABLE = new Set(['post_like', 'follow']);

function groupRows(rows: NotificationDTO[]): Group[] {
  const groups: Group[] = [];
  const index = new Map<string, Group>();
  for (const n of rows) {
    const category = (n.category as NotificationCategory) || 'likes';
    const key = GROUPABLE.has(n.kind) ? `${bucketLabel(n.createdAt)}|${n.kind}|${n.targetType ?? ''}|${n.targetId ?? ''}` : n.id;
    const existing = index.get(key);
    const actor = actorOf(n);
    if (existing) {
      existing.items.push(n);
      if (actor && !existing.actors.includes(actor)) existing.actors.push(actor);
      existing.unread = existing.unread || !n.readAt;
      continue;
    }
    const g: Group = { id: n.id, kind: n.kind, category, items: [n], actors: actor ? [actor] : [], latest: n, unread: !n.readAt };
    index.set(key, g);
    groups.push(g);
  }
  return groups;
}

function actorsSentence(actors: string[]) {
  const shown = actors.slice(0, 2).map((a) => `@${a}`);
  const extra = actors.length - shown.length;
  if (actors.length === 0) return '';
  if (extra <= 0) return shown.join(' and ');
  return `${shown.join(', ')} and ${extra} ${extra === 1 ? 'other' : 'others'}`;
}

type Filter = 'all' | 'unread' | NotificationCategory;

export default function Notifications() {
  usePageMeta('Notifications');
  const { notifications, unreadCount, settings, setSettings, markAllRead, markRead, openNotification } = useNotifications();
  const { services, user, isBackendConfigured } = useAuth();
  const { isFollowing, toggleFollow } = useFollowing();
  const { posts } = usePosts();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [acted, setActed] = useState<Record<string, 'approved' | 'declined'>>({});

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: notifications.length, unread: unreadCount, mentions: 0, comments: 0, follows: 0, likes: 0, albums: 0 };
    for (const n of notifications) c[(n.category as NotificationCategory) || 'likes'] += 1;
    return c;
  }, [notifications, unreadCount]);

  const rows = useMemo(() => {
    const filtered = filter === 'all' ? notifications : filter === 'unread' ? notifications.filter((n) => !n.readAt) : notifications.filter((n) => ((n.category as NotificationCategory) || 'likes') === filter);
    return groupRows(filtered);
  }, [notifications, filter]);

  const postTitle = (n: NotificationDTO) => {
    if (n.targetType !== 'post' || !n.targetId) return null;
    const post = posts.find((p) => p.id === n.targetId);
    return post ? { title: post.title, type: post.type } : null;
  };

  const openGroup = async (g: Group) => {
    await Promise.all(g.items.filter((n) => !n.readAt && n.id !== g.latest.id).map((n) => markRead(n.id)));
    await openNotification(g.latest);
  };

  const requesterOf = (n: NotificationDTO) => n.actorId ?? n.targetId ?? null;

  const resolveRequest = async (e: MouseEvent, n: NotificationDTO, approve: boolean) => {
    e.stopPropagation();
    const requesterId = requesterOf(n);
    if (!services || !user || !isBackendConfigured || !requesterId) {
      toast('Follow requests need a signed-in account.', 'error');
      return;
    }
    try {
      if (approve) await services.follows.approveRequest(user.id, requesterId);
      else await services.follows.rejectRequest(user.id, requesterId);
      setActed((a) => ({ ...a, [n.id]: approve ? 'approved' : 'declined' }));
      await markRead(n.id);
      toast(approve ? 'Follow request approved.' : 'Follow request declined.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update the request.', 'error');
    }
  };

  const followBack = async (e: MouseEvent, n: NotificationDTO) => {
    e.stopPropagation();
    const id = n.actorId ?? n.targetId;
    if (!id) return;
    await toggleFollow('user', id);
    await markRead(n.id);
  };

  const chip = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
      active ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
    );

  let lastBucket = '';

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn(ACCENTS.amber.iconTile, 'mb-0 h-11 w-11 shrink-0')}>
            <Bell size={20} className="text-white" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Notifications</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {unreadCount === 0 ? 'You are all caught up.' : `${unreadCount} unread`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markAllRead} disabled={unreadCount === 0} className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-default disabled:opacity-40">
            Mark all read
          </button>
          <button
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Notification settings"
            aria-expanded={showSettings}
            className={cn('rounded-full border p-2 transition-colors', showSettings ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800')}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {(['all', 'unread', ...CATEGORY_ORDER] as Filter[]).map((f) => {
          const meta = f === 'all' || f === 'unread' ? null : CATEGORY_META[f];
          const n = counts[f];
          if (meta && n === 0 && filter !== f) return null;
          return (
            <button key={f} onClick={() => setFilter(f)} className={chip(filter === f)}>
              {meta && <meta.Icon size={13} />}
              {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : meta!.label}
              {n > 0 && f !== 'all' && (
                <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold', filter === f ? 'bg-white/20 text-white dark:bg-zinc-950/15 dark:text-zinc-950' : 'bg-white text-slate-700 dark:bg-zinc-900 dark:text-zinc-200')}>{n}</span>
              )}
            </button>
          );
        })}
      </div>

      {showSettings && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className={ACCENTS.amber.topBar} />
          <div className="p-5">
            <h2 className="font-bold">What you get notified about</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-zinc-400">Turning a type off hides it here and in the sidebar badge. Nothing is ever emailed unless you opt in under Edit Profile.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CATEGORY_ORDER.map((key) => {
                const meta = CATEGORY_META[key];
                return (
                  <label key={key} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm dark:bg-zinc-950/50">
                    <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white', meta.badge)}><meta.Icon size={13} strokeWidth={2.5} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900 dark:text-zinc-100">{meta.label}</span>
                      <span className="block text-xs text-slate-500 dark:text-zinc-400">{meta.description}</span>
                    </span>
                    <input type="checkbox" checked={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} className="mt-1 accent-emerald-500" />
                  </label>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          accent="amber"
          title={filter === 'unread' ? 'All caught up' : filter === 'all' ? 'No notifications yet' : `No ${CATEGORY_META[filter as NotificationCategory]?.label.toLowerCase() ?? 'notifications'} yet`}
          description={filter === 'all' ? 'When people reply, follow you, or find your posts helpful, it shows up here.' : 'Nothing in this category right now.'}
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          {rows.map((g) => {
            const n = g.latest;
            const meta = CATEGORY_META[g.category];
            const bucket = bucketLabel(n.createdAt);
            const header = bucket !== lastBucket ? bucket : null;
            lastBucket = bucket;
            const { rest } = splitTitle(n.title);
            const sentence = actorsSentence(g.actors);
            const post = postTitle(n);
            const PostIcon = post?.type === 'Dispatch' ? FlaskConical : Radio;
            const decision = acted[n.id];
            const actorId = n.actorId ?? n.targetId;
            const showFollowBack = g.kind === 'follow' && g.items.length === 1 && !!actorId && !isFollowing('user', actorId);

            return (
              <div key={g.id}>
                {header && (
                  <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-400">
                    {header}
                  </div>
                )}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => void openGroup(g)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void openGroup(g); } }}
                  className={cn(
                    'relative flex w-full cursor-pointer items-start gap-3.5 border-b border-slate-100 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:border-zinc-800 dark:hover:bg-zinc-950/60',
                    g.unread && 'bg-emerald-50/40 dark:bg-emerald-500/[0.04]',
                  )}
                >
                  {g.unread && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500" />}

                  {/* Actor avatars: one chip, or a stack of up to three for a group. */}
                  <span className="relative flex shrink-0 items-center">
                    {(g.actors.length ? g.actors.slice(0, 3) : ['@']).map((a, i) => (
                      <span
                        key={a}
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-base font-bold dark:border-zinc-900',
                          a === '@' ? 'bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-200' : avatarColor(a),
                          i > 0 && '-ml-5',
                        )}
                        style={{ zIndex: 3 - i }}
                      >
                        {a[0].toUpperCase()}
                      </span>
                    ))}
                    <span className={cn('absolute -bottom-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-white dark:border-zinc-900', meta.badge)}>
                      <meta.Icon size={10} strokeWidth={2.75} />
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={cn('min-w-0 text-[15px] leading-snug', g.unread ? 'text-slate-900 dark:text-zinc-50' : 'text-slate-700 dark:text-zinc-300')}>
                        {sentence ? <><span className="font-bold">{sentence}</span> <span className={g.unread ? 'font-medium' : ''}>{rest}</span></> : <span className={g.unread ? 'font-semibold' : ''}>{rest}</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <time title={exactTime(n.createdAt)} className="text-xs tabular-nums text-slate-500 dark:text-zinc-400">{relativeTime(n.createdAt)}</time>
                        {g.unread && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                      </span>
                    </span>

                    {post ? (
                      <span className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
                        <PostIcon size={14} className="shrink-0 text-slate-500 dark:text-zinc-400" />
                        <span className="truncate"><span className="text-slate-500 dark:text-zinc-400">{post.type} · </span>{post.title}</span>
                      </span>
                    ) : n.body ? (
                      <span className="mt-2 block truncate rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-zinc-950/60 dark:text-zinc-400">{n.body}</span>
                    ) : null}

                    {/* Inline actions */}
                    {g.kind === 'follow_request' && (
                      decision ? (
                        <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                          {decision === 'approved' ? <><Check size={12} /> Approved</> : <><X size={12} /> Declined</>}
                        </span>
                      ) : (
                        <span className="mt-2.5 flex gap-2">
                          <button onClick={(e) => void resolveRequest(e, n, true)} className="rounded-full bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">Approve</button>
                          <button onClick={(e) => void resolveRequest(e, n, false)} className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Decline</button>
                        </span>
                      )
                    )}
                    {showFollowBack && (
                      <span className="mt-2.5 flex">
                        <button onClick={(e) => void followBack(e, n)} className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Follow back</button>
                      </span>
                    )}
                    {(g.category === 'comments' || g.category === 'mentions') && n.link && (
                      <span className="mt-2.5 flex">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><MessageCircle size={12} /> Reply</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
