import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { usePageMeta } from '../hooks/usePageMeta';
import { normalizeUsername } from '../lib/account';
import type { FollowListEntry } from '../services/types';

/**
 * /profile/:username/followers and /profile/:username/following.
 * Lists are private unless the owner turned the matching toggle on; the
 * server enforces that and this page just explains the refusal.
 */
export default function FollowList() {
  const { username = '' } = useParams<{ username: string }>();
  const kind = useLocation().pathname.endsWith('/following') ? 'following' : 'followers';
  usePageMeta(`@${username} · ${kind}`);
  const { services, isBackendConfigured, status } = useAuth();
  const [entries, setEntries] = useState<FollowListEntry[] | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'private' | 'missing' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    if (!isBackendConfigured || !services || status === 'loading') return;
    (async () => {
      try {
        const profile = await services.profiles.getByUsername(normalizeUsername(username));
        if (!profile) { if (active) setState('missing'); return; }
        const rows = kind === 'followers' ? await services.follows.listFollowers(profile.id) : await services.follows.listFollowing(profile.id);
        if (!active) return;
        setEntries(rows);
        setState('ok');
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : '';
        setState(/_private/.test(msg) ? 'private' : 'error');
      }
    })();
    return () => { active = false; };
  }, [isBackendConfigured, services, status, username, kind]);

  const title = kind === 'followers' ? 'Followers' : 'Following';

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6">
      <Link to={`/profile/${username}`} className="flex w-fit items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200">
        <ArrowLeft size={16} /> @{username}
      </Link>
      <h1 className="mt-3 flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">
        <Users size={22} className="text-emerald-500" /> {title}
      </h1>

      {!isBackendConfigured ? (
        <EmptyState icon={Users} title="Not available in preview" description="Follower lists need an account backend." />
      ) : state === 'loading' ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-zinc-400">Loading…</p>
      ) : state === 'private' ? (
        <EmptyState icon={Lock} title={`This ${kind} list is private`} description={`@${username} has not made their ${kind} list public. Counts may still be shown on their profile.`} />
      ) : state === 'missing' ? (
        <EmptyState icon={Users} title="Profile not found" description="There is no account with that username." />
      ) : state === 'error' ? (
        <EmptyState icon={Users} title="Could not load this list" description="Try again in a moment." />
      ) : entries && entries.length === 0 ? (
        <EmptyState icon={Users} title={kind === 'followers' ? 'No followers yet' : 'Not following anyone yet'} description="" />
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50">
          {entries?.map((e) => (
            <li key={e.userId}>
              <Link to={`/profile/${e.username}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800/60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {e.avatarUrl ? <img src={e.avatarUrl} alt="" className="h-full w-full object-cover" /> : e.username.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900 dark:text-zinc-100">{e.displayName || e.username}</span>
                  <span className="block truncate text-sm text-slate-500 dark:text-zinc-400">@{e.username}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
