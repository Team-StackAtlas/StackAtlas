import { useState, useEffect } from 'react';
import { Search, Flame, TrendingUp, Clock, MessageSquare, ArrowBigUp, Layers, Plus, Settings2 } from 'lucide-react';
import { BRANDS, DOMAIN_STRUCTURE, STACKS, SUPPLEMENTS, Domain, Post, getPosts, SCOPE_CLASSIFICATIONS, CLASSIFICATIONS } from '../data/mockData';
import { cn } from '../lib/utils';
import PostCard from '../components/PostCard';
import { useSearchParams, Link } from 'react-router-dom';
import { useUserScope } from '../context/UserScopeContext';
import { useFilters } from '../context/FilterContext';
import { useFollowing } from '../hooks/useFollowing';
import AdvancedSearchModal from '../components/AdvancedSearchModal';
import { useHiddenItems } from '../hooks/useHiddenItems';
import { useMockRole } from '../context/MockRoleContext';

export default function Square() {
  const { scope } = useUserScope();
  const { activeTypes, activeAdmins, activeClassifications } = useFilters();
  const visibleClassifications = scope.accessLevel
    ? SCOPE_CLASSIFICATIONS[scope.accessLevel]
    : CLASSIFICATIONS;
  const { isFollowing } = useFollowing();
  const { isAdminLike } = useMockRole();
  const { isHidden, hasHiddenTag } = useHiddenItems();
  const [searchParams] = useSearchParams();
  const substanceId = searchParams.get('substance');
  const filterParam = searchParams.get('filter');
  const bearingParam = searchParams.get('bearing');

  const [feedType, setFeedType] = useState<'For You' | 'Following'>('For You');
  const [activeDomain, setActiveDomain] = useState<Domain | 'All'>('All');
  const [activeCategory, setActiveCategory] = useState<string | 'All'>('All');
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'Highest Quality' | 'Most Detailed' | 'Recent' | 'Trending'>('Recent');
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);

  const domains = ['All', ...DOMAIN_STRUCTURE.map(d => d.domain).filter(d => d !== 'All')];
  
  const currentDomainData = DOMAIN_STRUCTURE.find(d => d.domain === activeDomain);
  const categories = currentDomainData ? currentDomainData.categories.map(c => c.name) : [];

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
      const isLinkedToFollowed =
        isFollowing('user', p.author.id) ||
        (!!p.supplementId && isFollowing('substance', p.supplementId)) ||
        (!!p.stackId && isFollowing('stack', p.stackId)) ||
        (!!p.brandId && isFollowing('brand', p.brandId));
      if (!isLinkedToFollowed) return false;
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
        
        // Marker Filtering
        if (activeMarker && (!supplement.markers || !supplement.markers.includes(activeMarker))) return false;
      }
    }

    if (bearingParam && (!p.bearings || !p.bearings.includes(bearingParam))) return false;

    if (substanceId && p.supplementId !== substanceId) return false;
    if (!substanceId && !bearingParam) {
      if (activeDomain !== 'All' && p.domain !== activeDomain) return false;
      if (activeCategory !== 'All' && p.category !== activeCategory) return false;
    }
    return true;
  };



  const allPosts = getPosts();
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
      return (b.helpfulCount + b.comments) - (a.helpfulCount + a.comments);
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
            onClick={() => setFeedType('Following')}
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

      {/* Browse Domains */}
      {!substanceId && !bearingParam && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
            {domains.map(domain => (
              <button
                key={domain}
                onClick={() => {
                  setActiveDomain(domain as any);
                  setActiveCategory('All');
                }}
                className={cn(
                  "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
                  activeDomain === domain 
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 shadow-sm" 
                    : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200"
                )}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories (if domain selected) */}
      {!substanceId && !bearingParam && categories.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "whitespace-nowrap px-3 py-1 rounded-lg text-xs font-medium transition-all border",
                  activeCategory === category 
                    ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-200 border-slate-300 dark:border-zinc-700 shadow-sm" 
                    : "bg-white/50 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-300"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Markers Filter */}
      {!substanceId && !bearingParam && (
        <div className="px-4 pb-2">
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
            {['Clinical Use', 'Longevity Protocol', 'Athletic Performance', 'Cognitive Stack Culture', 'East Asian Traditional Medicine', 'Western Herbalism'].map(marker => (
              <button
                key={marker}
                onClick={() => setActiveMarker(activeMarker === marker ? null : marker)}
                className={cn(
                  "whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                  activeMarker === marker 
                    ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/30 shadow-sm" 
                    : "bg-white/50 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-300"
                )}
              >
                {marker}
              </button>
            ))}
          </div>
        </div>
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
              onClick={() => setSortOption(option as any)}
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
