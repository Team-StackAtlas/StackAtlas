import { useState } from 'react';
import { Search, Flame, Clock, ArrowBigUp, Layers, Plus, Settings2, Users } from 'lucide-react';
import { BRANDS, STACKS, SUPPLEMENTS, Post, SCOPE_CLASSIFICATIONS, CLASSIFICATIONS } from '../data/mockData';
import { usePosts } from '../context/PostsContext';
import { cn } from '../lib/utils';
import PostCard from '../components/PostCard';
import { useSearchParams, Link } from 'react-router-dom';
import { useUserScope } from '../context/UserScopeContext';
import { useFilters } from '../context/FilterContext';
import { useFollowing } from '../hooks/useFollowing';
import { isBackendConfigured } from '../services/supabase/client';
import AdvancedSearchModal from '../components/AdvancedSearchModal';
import { useHiddenItems } from '../hooks/useHiddenItems';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from '../hooks/useRequireAccountAction';
import { BearingCategoryFilter } from '../components/BearingCategoryFilter';
import { BEARING_CATEGORIES, getFilterBearings } from '../lib/bearings';
import { getPostCommentCount } from '../lib/comments';
import { EmptyState } from '../components/EmptyState';
import SquareRail from '../components/SquareRail';

const SORT_OPTIONS = [
  { value: 'Highest Quality', icon: ArrowBigUp },
  { value: 'Most Detailed', icon: Layers },
  { value: 'Recent', icon: Clock },
  { value: 'Trending', icon: Flame },
] as const;

export default function Square() {
  const { scope } = useUserScope();
  const { activeTypes, activeAdmins, activeClassifications } = useFilters();
  const visibleClassifications = scope.accessLevel
    ? SCOPE_CLASSIFICATIONS[scope.accessLevel]
    : CLASSIFICATIONS;
  const { following, isFollowing } = useFollowing();
  const { user } = useAuth();
  const requireAccount = useRequireAccountAction();
  const isAdminLike = user?.role === 'Admin' || user?.role === 'Developer';
  const { isHidden, hasHiddenTag } = useHiddenItems();
  const [searchParams] = useSearchParams();
  const substanceId = searchParams.get('substance');
  const bearingParam = searchParams.get('bearing');

  const [feedType, setFeedTypeState] = useState<'For You' | 'Following'>(() => user ? (localStorage.getItem('stackatlas_square_tab') as 'For You' | 'Following') || 'For You' : 'For You');
  const [followingFilter, setFollowingFilter] = useState<'All' | 'Users' | 'Substances' | 'Brands' | 'Stacks' | 'Albums'>('All');
  const setFeedType = (next: 'For You' | 'Following') => {
    setFeedTypeState(next);
    if (user) localStorage.setItem('stackatlas_square_tab', next);
  };
  const [activeCategoryGroup, setActiveCategoryGroup] = useState<string | null>(null);
  const [activeBearings, setActiveBearings] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<'Highest Quality' | 'Most Detailed' | 'Recent' | 'Trending'>('Recent');
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const activeCategoryBearings = activeCategoryGroup ? BEARING_CATEGORIES.find(category => category.name === activeCategoryGroup)?.bearings ?? [] : [];

  const isPostHiddenByPreferences = (post: Post) => {
    if (isAdminLike) return false;

    const supplement = post.supplementId ? SUPPLEMENTS.find(s => s.id === post.supplementId) : undefined;
    const stack = post.stackId ? STACKS.find(s => s.id === post.stackId) : undefined;
    const brand = post.brandId ? BRANDS.find(b => b.id === post.brandId) : undefined;

    if (post.supplementId && isHidden('substance', post.supplementId)) return true;
    if (post.stackId && isHidden('stack', post.stackId)) return true;
    if (post.brandId && isHidden('brand', post.brandId)) return true;

    const structuredTags = [
      post.domain,
      post.category,
      ...(post.bearings || []),
      ...(supplement?.paths.flatMap(path => [path.domain, path.category]) || []),
      ...(supplement?.typeTags || []),
      ...(supplement?.markers || []),
      ...(stack?.markers || []),
      ...(brand?.markers || []),
    ];

    return hasHiddenTag(structuredTags);
  };

  const passesFeedFilters = (p: Post) => {

    // Feed Type Filtering — Following is public/social: posts by a followed
    // author or linked to a followed substance/stack/brand.
    if (feedType === 'Following') {
      // Backed mode requires sign-in; mock mode follows live in localStorage.
      if (isBackendConfigured && !user) return false;
      const matches = [
        isFollowing('user', p.author.id) && 'Users',
        !!p.supplementId && isFollowing('substance', p.supplementId) && 'Substances',
        !!p.stackId && isFollowing('stack', p.stackId) && 'Stacks',
        !!p.brandId && isFollowing('brand', p.brandId) && 'Brands',
      ].filter(Boolean);
      if (matches.length === 0) return false;
      if (followingFilter !== 'All' && !matches.includes(followingFilter)) return false;
    }

    // Access Level Filtering and Advanced Search Filtering for Dispatch posts
    if (p.type === 'Dispatch' && p.supplementId) {
      const supplement = SUPPLEMENTS.find(s => s.id === p.supplementId);
      if (supplement) {
        // Scope ceiling by classification
        if (!visibleClassifications.includes(supplement.classification)) return false;

        // Advanced Search Filtering — positive model: an empty selection means
        // "no filter" (matches Map's behavior since the filter defaults went
        // empty; the old subtractive checks hid every substance Dispatch).
        if (activeTypes.length > 0 && !supplement.typeTags.some(t => activeTypes.includes(t))) return false;
        if (activeClassifications.length > 0 && !activeClassifications.includes(supplement.classification)) return false;
        if (activeAdmins.length > 0 && !supplement.administration.some(a => activeAdmins.includes(a))) return false;

      }
    }

    if (bearingParam && (!p.bearings || !p.bearings.includes(bearingParam))) return false;

    if (substanceId && p.supplementId !== substanceId) return false;
    if (!substanceId && !bearingParam && activeCategoryGroup) {
      const selected = activeBearings.length > 0 ? activeBearings : activeCategoryBearings;
      const postBearings = getFilterBearings([...(p.bearings ?? []), p.category]);
      if (!selected.some(bearing => postBearings.includes(bearing))) return false;
    }
    return true;
  };

  const matchesQuery = (p: Post) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return (
      p.title.toLowerCase().includes(needle) ||
      p.content.toLowerCase().includes(needle) ||
      p.author.username.toLowerCase().includes(needle) ||
      (p.author.displayName?.toLowerCase().includes(needle) ?? false)
    );
  };

  const { posts: allPosts } = usePosts();
  const postsMatchingFilters = allPosts.filter(passesFeedFilters);
  const hiddenPostsCount = postsMatchingFilters.filter(isPostHiddenByPreferences).length;
  const filteredPosts = postsMatchingFilters.filter(post => !isPostHiddenByPreferences(post)).filter(matchesQuery);

  // Goals picked at onboarding shape the For You feed: posts whose bearings
  // (or category) map into a chosen goal category rank ahead of the rest,
  // with the selected sort ordering within each tier. Explicit filters
  // (substance/bearing links) and the Following feed stay untouched.
  const goalBearings = new Set(
    scope.goals.flatMap(goal => BEARING_CATEGORIES.find(category => category.name === goal)?.bearings ?? []),
  );
  const applyGoalBoost = feedType === 'For You' && goalBearings.size > 0 && !substanceId && !bearingParam;
  const goalScoreByPost = new Map<string, number>(
    applyGoalBoost
      ? filteredPosts.map(post => [
          post.id,
          getFilterBearings([...(post.bearings ?? []), post.category]).filter(bearing => goalBearings.has(bearing)).length,
        ])
      : [],
  );

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (applyGoalBoost) {
      const goalDiff = (goalScoreByPost.get(b.id) ?? 0) - (goalScoreByPost.get(a.id) ?? 0);
      if (goalDiff !== 0) return goalDiff;
    }
    if (sortOption === 'Highest Quality') return b.qualityScore - a.qualityScore;
    if (sortOption === 'Most Detailed') return b.content.length - a.content.length;
    if (sortOption === 'Recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortOption === 'Trending') {
      return (b.helpfulCount + getPostCommentCount(b)) - (a.helpfulCount + getPostCommentCount(a));
    }
    return 0;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 pb-24 md:pb-8 transition-colors duration-200">
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-start gap-8">
      {/* Feed column */}
      <div className="min-w-0 flex-1 md:max-w-2xl">
      {/* Command bar: x.com-style full-width underline tabs, then search. */}
      <div className="sticky top-14 md:top-0 z-40 border-b border-slate-200/70 bg-slate-50/90 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/90">
        <div className="flex border-b border-slate-200/70 dark:border-zinc-800/70">
          {(['For You', 'Following'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { if (tab === 'Following' && !user) { if (requireAccount()) setFeedType('Following'); return; } setFeedType(tab); }}
              className="group flex-1 transition-colors hover:bg-slate-100/70 dark:hover:bg-zinc-900/70"
            >
              <span
                className={cn(
                  'relative inline-flex items-center py-3.5 text-[15px]',
                  feedType === tab
                    ? 'font-bold text-slate-900 dark:text-zinc-100'
                    : 'font-medium text-slate-500 group-hover:text-slate-700 dark:text-zinc-400 dark:group-hover:text-zinc-200',
                )}
              >
                {tab}
                {feedType === tab && (
                  <span className="absolute inset-x-0 -bottom-px h-1 rounded-full bg-emerald-500" />
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="w-full px-4">
          <div className="flex gap-2 py-3">
            <Link to="/create" aria-label="Create a post" className="hidden md:inline-flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm shrink-0 order-last">
              <Plus size={16} />
              Create
            </Link>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the Square…"
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 focus:bg-white dark:focus:bg-zinc-900 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
              />
            </div>
            <button
              onClick={() => setIsAdvancedSearchOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors shrink-0"
              aria-label="Advanced filters"
            >
              <Settings2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {!substanceId && !bearingParam && (
        <div className="pt-4">
          <BearingCategoryFilter
            selectedCategory={activeCategoryGroup}
            selectedBearings={activeBearings}
            onCategoryChange={(category) => { setActiveCategoryGroup(category); setActiveBearings([]); }}
            onBearingToggle={(bearing) => setActiveBearings((current) => current.includes(bearing) ? current.filter(item => item !== bearing) : [...current, bearing])}
            onReset={() => { setActiveCategoryGroup(null); setActiveBearings([]); }}
          />
        </div>
      )}

      {/* Bearing Filter Display */}
      {bearingParam && (
        <div className="w-full px-4 pt-4 pb-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-zinc-400">Filtering by bearing</span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              {bearingParam}
            </span>
            <Link to="/square" className="text-sm font-medium text-emerald-600 dark:text-emerald-500 hover:underline ml-1">
              Clear
            </Link>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 w-full px-4 pt-4">
        <div className="mb-4 space-y-3">
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
            {sortedPosts.length.toLocaleString()} {sortedPosts.length === 1 ? 'post' : 'posts'}
          </p>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-x-auto hide-scrollbar">
            {SORT_OPTIONS.map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSortOption(value)}
                className={cn(
                  'flex-1 whitespace-nowrap flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  sortOption === value
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200',
                )}
              >
                <Icon size={14} />
                {value}
              </button>
            ))}
          </div>

          {feedType === 'Following' && (
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 hide-scrollbar">
              {(['All', 'Users', 'Substances', 'Brands', 'Stacks', 'Albums'] as const).map((filter) => (
                <button key={filter} onClick={() => setFollowingFilter(filter)} className={cn('whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', followingFilter === filter ? 'bg-slate-100 text-slate-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200')}>{filter}</button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {hiddenPostsCount > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              Some posts were hidden by your preferences.
            </div>
          )}
          {sortedPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
          {sortedPosts.length === 0 && (
            query.trim() ? (
              <EmptyState
                icon={Search}
                title="Nothing matches your search"
                description="Try different terms, or clear the search to see the full feed."
              />
            ) : feedType === 'Following' ? (
              following.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Your Following feed is empty"
                  description="Follow users, substances, brands, stacks, or public albums to see their activity here."
                />
              ) : (
                <EmptyState
                  icon={Layers}
                  title="No followed items match this filter"
                  description="Try a different filter, or follow more to broaden your feed."
                />
              )
            ) : (
              <EmptyState
                icon={Layers}
                title="No posts match these filters"
                description="Adjust your filters or check back later for new discussion."
              />
            )
          )}
        </div>
      </div>
      </div>

      {/* Right rail (desktop): keeps the wide viewport from reading as a
          lone narrow feed column stranded in empty space. */}
      <aside className="hidden lg:block lg:sticky lg:top-20 lg:w-72 lg:shrink-0 lg:pt-5">
        <SquareRail posts={allPosts} />
      </aside>
      </div>

      {/* Floating Action Button (Mobile) */}
      <Link to="/create" className="md:hidden fixed bottom-20 right-4 h-14 w-14 flex items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-500 transition-colors z-40">
        <Plus size={24} />
      </Link>

      <AdvancedSearchModal
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
      />
    </div>
  );
}
