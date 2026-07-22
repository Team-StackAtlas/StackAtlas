import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Sparkles, TrendingUp } from 'lucide-react';
import { SUPPLEMENTS, type Post, type Substance } from '../data/mockData';
import { useFollowing } from '../hooks/useFollowing';
import { useUserScope } from '../context/UserScopeContext';
import { getCanonicalCategories } from '../lib/bearings';
import AccessBadge from './AccessBadge';

/** Top bearings by frequency across the current feed, most-mentioned first. */
function topBearings(posts: Post[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const bearing of post.bearings ?? []) {
      counts.set(bearing, (counts.get(bearing) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([bearing]) => bearing);
}

/** Substances most discussed in the current feed, by post count. */
function trendingSubstances(posts: Post[], limit: number): { substance: Substance; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (post.supplementId) counts.set(post.supplementId, (counts.get(post.supplementId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ substance: SUPPLEMENTS.find((s) => s.id === id), count }))
    .filter((row): row is { substance: Substance; count: number } => !!row.substance)
    .slice(0, limit);
}

/** Small avatar + name + classification, linking to a substance. */
function SubstanceLine({ substance, meta }: { substance: Substance; meta?: ReactNode }) {
  return (
    <Link to={`/substance/${substance.id}`} className="flex min-w-0 flex-1 items-center gap-2.5 hover:opacity-80">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
        {substance.name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">{substance.name}</span>
        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-500">
          {meta ?? (
            <>
              <AccessBadge classification={substance.classification} />
              {substance.classification}
            </>
          )}
        </span>
      </span>
    </Link>
  );
}

/** Desktop-only right rail (x.com-style). Leads with Discover — what's being
 * discussed plus a few substances to follow — so it complements the bearing
 * category cards on the feed rather than repeating them; trending bearings sit
 * below as a secondary way in. */
export default function SquareRail({ posts }: { posts: Post[] }) {
  const { isFollowing, toggleFollow } = useFollowing();
  const { scope } = useUserScope();
  const trending = trendingSubstances(posts, 3);
  const trendingIds = new Set(trending.map((row) => row.substance.id));
  // Suggestions prefer substances matching the user's onboarding goals, so
  // Discover reflects what they said they're here for.
  const goalMatches = (s: Substance) =>
    getCanonicalCategories(s.paths.map((p) => p.category)).filter((c) => scope.goals.includes(c)).length;
  const suggestions = SUPPLEMENTS
    .filter((s) => !isFollowing('substance', s.id) && !trendingIds.has(s.id))
    .sort((a, b) => goalMatches(b) - goalMatches(a))
    .slice(0, 3);
  const bearings = topBearings(posts, 8);

  return (
    <div className="space-y-4">
      {(trending.length > 0 || suggestions.length > 0) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Discover</h3>
          </div>

          {trending.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                <TrendingUp size={12} /> Most discussed
              </p>
              <div className="space-y-1">
                {trending.map(({ substance, count }) => (
                  <div key={substance.id} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
                    <SubstanceLine
                      substance={substance}
                      meta={<span className="text-slate-500 dark:text-zinc-500">{count} {count === 1 ? 'post' : 'posts'}</span>}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className={trending.length > 0 ? 'border-t border-slate-100 pt-3 dark:border-zinc-800/60' : ''}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                Suggested to follow
              </p>
              <div className="space-y-1">
                {suggestions.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
                    <SubstanceLine substance={s} />
                    <button
                      type="button"
                      onClick={() => toggleFollow('substance', s.id)}
                      className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link to="/map" className="mt-2 block text-center text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            Explore the Map
          </Link>
        </div>
      )}

      {bearings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-3 flex items-center gap-2">
            <Flame size={16} className="text-orange-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Trending bearings</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bearings.map((bearing) => (
              <Link
                key={bearing}
                to={`/square?bearing=${encodeURIComponent(bearing)}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                {bearing}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
