import { useState } from 'react';
import { Search, Flame, Clock, ArrowBigUp, Layers, Plus, Settings2 } from 'lucide-react';
import { BRANDS, STACKS, SUPPLEMENTS, Post, SCOPE_CLASSIFICATIONS, CLASSIFICATIONS } from '../data/mockData';
import { usePosts } from '../context/PostsContext';
import { cn } from '../lib/utils';
import PostCard from '../components/PostCard';
import { useSearchParams, Link } from 'react-router-dom';
import { useUserScope } from '../context/UserScopeContext';
import { useFilters } from '../context/FilterContext';
import { useFollowing } from '../hooks/useFollowing';
import AdvancedSearchModal from '../components/AdvancedSearchModal';
import { useHiddenItems } from '../hooks/useHiddenItems';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from '../hooks/useRequireAccountAction';
import { BearingCategoryFilter } from '../components/BearingCategoryFilter';
import { BEARING_CATEGORIES, getFilterBearings } from '../lib/bearings';
import { getPostCommentCount } from '../lib/comments';

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
      if (!user) return false;
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

        // Advanced Search Filtering
        if (!supplement.typeTags.some(t => activeTypes.includes(t))) return false;
        if (!activeClassifications.includes(supplement.classification)) return false;
        if (!supplement.administration.some(a => activeAdmins.includes(a))) return false;
        
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



  const { posts: allPosts } = usePosts();
  const postsMatchingFilters = allPosts.filter(passesFeedFilters);
  const hiddenPostsCount = postsMatchingFilters.filter(isPostHiddenByPreferences).length;
  const filteredPosts = postsMatchingFilters.filter(post => !isPostHiddenByPreferences(post));

  const sortedPosts = [...filteredPosts].sort((a, b) => {
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
      {/* Feed Type Tabs */}
      <div className="sticky top-14 md:top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800">
        <div className="flex w-full">
          <button
            onClick={() => setFeedType('For You')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold transition-colors border-b-2",
              feedType === 'For You' 
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" 
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
            )}
          >
            For You
          </button>
          <button
            onClick={() => { if (user || requireAccount()) setFeedType('Following'); }}
            className={cn(
              "flex-1 py-3 text-sm font-semibold transition-colors border-b-2",
              feedType === 'Following' 
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" 
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
            )}
          >
            Following
          </button>
        </div>
      </div>

      {/* Search Bar & Create Post */}
      <div className="p-4 sticky top-[104px] md:top-[46px] z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="search"
            placeholder="Search communities..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-sm"
          />
        </div>
        <button 
          onClick={() => setIsAdvancedSearchOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm shrink-0"
        >
          <Settings2 size={18} />
        </button>
        <Link to="/create" className="hidden md:flex items-center gap-2 h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm shrink-0">
          <Plus size={18} />
          Create Post
        </Link>
      </div>

      {!substanceId && !bearingParam && (
        <BearingCategoryFilter
          selectedCategory={activeCategoryGroup}
          selectedBearings={activeBearings}
          onCategoryChange={(category) => { setActiveCategoryGroup(category); setActiveBearings([]); }}
          onBearingToggle={(bearing) => setActiveBearings((current) => current.includes(bearing) ? current.filter(item => item !== bearing) : [...current, bearing])}
          onReset={() => { setActiveCategoryGroup(null); setActiveBearings([]); }}
        />
      )}

      {/* Bearing Filter Display */}
      {bearingParam && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-zinc-400">Filtering by bearing:</span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium border border-slate-200 dark:border-zinc-700">
              {bearingParam}
            </span>
            <Link to="/square" className="text-sm text-emerald-600 dark:text-emerald-500 hover:underline ml-2">
              Clear Filter
            </Link>
          </div>
        </div>
      )}

      {/* Sorting Options */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-1 shadow-sm overflow-x-auto hide-scrollbar">
          {['Highest Quality', 'Most Detailed', 'Recent', 'Trending'].map((option) => (
            <button
              key={option}
              onClick={() => setSortOption(option as 'Highest Quality' | 'Most Detailed' | 'Recent' | 'Trending')}
              className={cn(
                "flex-1 whitespace-nowrap flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                sortOption === option 
                  ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm" 
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              )}
            >
              {option === 'Highest Quality' && <ArrowBigUp size={14} />}
              {option === 'Most Detailed' && <Layers size={14} />}
              {option === 'Recent' && <Clock size={14} />}
              {option === 'Trending' && <Flame size={14} className={sortOption === 'Trending' ? "text-emerald-500" : ""} />}
              {option}
            </button>
          ))}
        </div>
      </div>


      {feedType === 'Following' && (
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            {(['All', 'Users', 'Substances', 'Brands', 'Stacks', 'Albums'] as const).map((filter) => (
              <button key={filter} onClick={() => setFollowingFilter(filter)} className={cn("whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium", followingFilter === filter ? "bg-slate-100 text-slate-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-slate-500 dark:text-zinc-400")}>{filter}</button>
            ))}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 px-4 space-y-4 max-w-2xl mx-auto w-full">
        {hiddenPostsCount > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            Some posts were hidden by your preferences.
          </div>
        )}
        {sortedPosts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        {sortedPosts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900">{feedType === 'Following' ? (following.length === 0 ? 'Follow users, substances, brands, stacks, or public albums to build your Following feed.' : 'No followed items match this filter yet.') : 'No posts match these filters.'}</div>
        )}
      </div>

      {/* Floating Action Button (Mobile) */}
      <Link to="/create" className="md:hidden fixed bottom-20 right-4 h-14 w-14 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-colors z-40">
        <Plus size={24} />
      </Link>

      <AdvancedSearchModal 
        isOpen={isAdvancedSearchOpen} 
        onClose={() => setIsAdvancedSearchOpen(false)} 
      />
    </div>
  );
}
