import { useMemo, useState } from 'react';
import { Search, Filter, Activity, ShieldAlert, Star, Settings2, X, Plus } from 'lucide-react';
import { DOMAIN_STRUCTURE, SUPPLEMENTS, BRANDS, STACKS, USERS, Domain, TypeTag, StatusClassification, AdministrationMethod, TYPE_TAGS } from '../data/mockData';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useUserScope } from '../context/UserScopeContext';
import { useFilters } from '../context/FilterContext';
import { useSaved } from '../hooks/useSaved';
import AdvancedSearchModal from '../components/AdvancedSearchModal';
import CreateStackModal from '../components/CreateStackModal';
import { SecondaryHideMenu } from '../components/SecondaryHideMenu';
import { HideItemButton } from '../components/HideItemButton';
import { useHiddenItems } from '../hooks/useHiddenItems';
import { useMockRole } from '../context/MockRoleContext';

const ADMIN_METHODS: AdministrationMethod[] = ['👄 Oral', '💉 Injectable', '🧴 Topical', '👅 Sublingual'];
const STATUSES: StatusClassification[] = ['🟢 Baseline', '🔵 Clinical', '🟣 Frontier', '🟡 Unregulated', '🟠 Restricted', '🔴 Illicit'];

type SearchableType = 'substance' | 'brand' | 'stack';
type RecentSearch = { id: string; name: string; type: SearchableType; timestamp: string };
type SearchResult = RecentSearch & { description: string; path: string; matchedOn: string; tags: string[] };

const RECENT_SEARCHES_STORAGE_KEY = 'stackatlas.recentSearches';

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function searchMatches(query: string, fields: string[]) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;
  const haystack = normalizeSearchText(fields.filter(Boolean).join(' '));
  return normalizedQuery.split(' ').every((term) => haystack.includes(term));
}

function readRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export default function Map() {
  const { scope } = useUserScope();
  const {
    activeTypes,
    prioritizedTypes,
    activeAdmins,
    activeStatuses,
    toggleType,
    togglePriority,
    toggleAdmin,
    toggleStatus
  } = useFilters();
  const { savedItems } = useSaved();
  const { isAdminLike } = useMockRole();
  const { isHidden, hasHiddenTag } = useHiddenItems();
  
  const [feedType, setFeedType] = useState<'For You' | 'Following'>('For You');
  const [activeTab, setActiveTab] = useState<'Substances' | 'Brands' | 'Stacks'>('Substances');
  const [activeDomain, setActiveDomain] = useState<Domain | 'All'>('All');
  const [activeCategory, setActiveCategory] = useState<string | 'All'>('All');
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [openMarkerMenu, setOpenMarkerMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => readRecentSearches());
  
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [isCreateStackOpen, setIsCreateStackOpen] = useState(false);

  const domains = ['All', ...DOMAIN_STRUCTURE.map(d => d.domain).filter(d => d !== 'All')];
  const visibleDomains = isAdminLike ? domains : domains.filter(domain => domain === 'All' || !isHidden('tag', `domain:${domain}`));
  
  const currentDomainData = DOMAIN_STRUCTURE.find(d => d.domain === activeDomain);
  const categories = currentDomainData ? currentDomainData.categories.map(c => c.name) : [];
  const visibleCategories = isAdminLike ? categories : categories.filter(category => category === 'All' || !isHidden('tag', `category:${activeDomain}:${category}`));
  const markerFilters = ['Clinical Use', 'Longevity Protocol', 'Athletic Performance', 'Cognitive Stack Culture', 'East Asian Traditional Medicine', 'Western Herbalism'];
  const visibleMarkerFilters = isAdminLike ? markerFilters : markerFilters.filter(marker => !isHidden('tag', `marker:${marker}`));

  const handleSearchClick = (item: { id: string; name: string; type: SearchableType }) => {
    const recentItem: RecentSearch = { ...item, timestamp: new Date().toISOString() };
    const newRecent = [recentItem, ...recentSearches.filter(r => !(r.id === item.id && r.type === item.type))].slice(0, 8);
    setRecentSearches(newRecent);
    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(newRecent));
  };

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim()) return [];

    const substanceResults: SearchResult[] = SUPPLEMENTS
      .filter((supplement) => searchMatches(searchQuery, [
        supplement.name,
        supplement.description,
        supplement.accessTag,
        ...supplement.paths.flatMap((path) => [path.domain, path.category]),
        ...supplement.typeTags,
        ...supplement.status,
        ...supplement.administration,
        ...(supplement.markers || []),
        ...supplement.healthRisks,
        ...supplement.subjectiveEffects,
        ...supplement.possiblePairings,
        supplement.riskLevel,
      ]))
      .map((supplement) => ({
        id: supplement.id,
        name: supplement.name,
        type: 'substance' as const,
        timestamp: new Date().toISOString(),
        description: supplement.description,
        path: `/supplement/${supplement.id}`,
        matchedOn: 'Substance',
        tags: [supplement.accessTag, ...supplement.paths.flatMap((path) => [path.domain, path.category]), ...supplement.typeTags, ...(supplement.markers || [])],
      }));

    const brandResults: SearchResult[] = BRANDS
      .filter((brand) => searchMatches(searchQuery, [
        brand.name,
        brand.description || '',
        ...(brand.products || []),
        ...(brand.markers || []),
        ...brand.thirdPartyTestingLinks,
      ]))
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
        type: 'brand' as const,
        timestamp: new Date().toISOString(),
        description: brand.description || `${brand.userRating}/5 user rating`,
        path: `/brand/${brand.id}`,
        matchedOn: 'Brand',
        tags: [...(brand.markers || [])],
      }));

    const stackResults: SearchResult[] = STACKS
      .filter((stack) => searchMatches(searchQuery, [
        stack.name,
        stack.description,
        stack.status,
        ...(stack.markers || []),
        ...stack.substances.map((substance) => substance.name),
      ]))
      .map((stack) => ({
        id: stack.id,
        name: stack.name,
        type: 'stack' as const,
        timestamp: new Date().toISOString(),
        description: stack.description,
        path: `/stack/${stack.id}`,
        matchedOn: 'Stack',
        tags: [...(stack.markers || []), ...stack.substances.map((substance) => substance.name)],
      }));

    return [...substanceResults, ...brandResults, ...stackResults].slice(0, 12);
  }, [searchQuery]);

  const visibleSearchResults = isAdminLike ? searchResults : searchResults.filter((result) => !isHidden(result.type, result.id) && !hasHiddenTag(result.tags));
  const hiddenSearchResultsCount = searchResults.length - visibleSearchResults.length;

  const filteredSupplements = SUPPLEMENTS.filter(s => {
    if (!isAdminLike && (isHidden('substance', s.id) || hasHiddenTag([s.accessTag, ...s.paths.flatMap(p => [p.domain, p.category]), ...s.typeTags, ...(s.markers || [])]))) return false;
    // Feed Type Filtering
    if (feedType === 'Following') {
      const isSaved = savedItems.some(item => item.id === s.id && item.type === 'substance');
      if (!isSaved) return false;
    }

    // Access Level Filtering
    if (scope.accessLevel === 'Citizen') {
      if (s.accessTag !== 'Standard') return false;
    } else if (scope.accessLevel === 'Patient') {
      if (s.accessTag !== 'Standard' && s.accessTag !== 'Pharma') return false;
    }
    // Explorer sees everything

    // Domain/Category Filtering
    if (activeDomain !== 'All' || activeCategory !== 'All') {
      const matchesPath = s.paths.some(p => {
        if (activeDomain !== 'All' && p.domain !== activeDomain) return false;
        if (activeCategory !== 'All' && p.category !== activeCategory) return false;
        return true;
      });
      if (!matchesPath) return false;
    }

    // Marker Filtering
    if (activeMarker && (!s.markers || !s.markers.includes(activeMarker))) return false;

    // Type Filtering
    if (!s.typeTags.some(t => activeTypes.includes(t))) return false;

    // Status Filtering
    if (s.status.some(st => !activeStatuses.includes(st))) return false;

    // Administration Filtering
    if (!s.administration.some(a => activeAdmins.includes(a))) return false;

    // Search Query Filtering
    if (searchQuery && !searchMatches(searchQuery, [s.name, s.description, s.accessTag, ...s.paths.flatMap(p => [p.domain, p.category]), ...s.typeTags, ...(s.markers || []), ...s.administration])) return false;

    return true;
  }).sort((a, b) => {
    if (feedType === 'For You') {
      const aScore = a.typeTags.length + (a.markers?.length || 0);
      const bScore = b.typeTags.length + (b.markers?.length || 0);
      if (aScore !== bScore) return bScore - aScore;
    }
    const aPrioritized = a.typeTags.some(t => prioritizedTypes.includes(t));
    const bPrioritized = b.typeTags.some(t => prioritizedTypes.includes(t));
    if (aPrioritized && !bPrioritized) return -1;
    if (!aPrioritized && bPrioritized) return 1;
    return 0;
  });

  const filteredBrands = BRANDS.filter(b => {
    if (!isAdminLike && (isHidden('brand', b.id) || hasHiddenTag([...(b.markers || [])]))) return false;
    if (feedType === 'Following') {
      const isSaved = savedItems.some(item => item.id === b.id && item.type === 'brand');
      if (!isSaved) return false;
    }
    if (searchQuery && !searchMatches(searchQuery, [b.name, b.description || '', ...(b.products || []), ...(b.markers || [])])) return false;
    return true;
  });

  const filteredStacks = STACKS.filter(s => {
    if (!isAdminLike && (isHidden('stack', s.id) || hasHiddenTag([...(s.markers || []), ...s.substances.map(substance => substance.name)]))) return false;
    if (feedType === 'Following') {
      const isSaved = savedItems.some(item => item.id === s.id && item.type === 'stack');
      if (!isSaved) return false;
    }
    if (searchQuery && !searchMatches(searchQuery, [s.name, s.description, ...(s.markers || []), ...s.substances.map(substance => substance.name)])) return false;
    return true;
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

      {/* Top Tabs */}
      <div className="sticky top-[104px] md:top-[46px] z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800">
        <div className="flex w-full">
          {['Substances', 'Brands', 'Stacks'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors relative",
                activeTab === tab ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 relative z-20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="search"
            placeholder={`Search substances, brands, stacks...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-sm"
          />
          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
              {!searchQuery && recentSearches.length > 0 && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider bg-slate-50 dark:bg-zinc-950/50">
                    Recent Searches
                  </div>
                  {recentSearches.map((recent, idx) => (
                    <Link
                      key={`${recent.id}-${idx}`}
                      to={`/${recent.type === 'substance' ? 'supplement' : recent.type}/${recent.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border-t border-slate-100 dark:border-zinc-800/50 first:border-0"
                      onClick={() => handleSearchClick(recent)}
                    >
                      <Search className="h-4 w-4 text-slate-400" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-zinc-100">{recent.name}</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 capitalize">{recent.type}</div>
                      </div>
                    </Link>
                  ))}
                </>
              )}
              {searchQuery && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider bg-slate-50 dark:bg-zinc-950/50">
                    Search Results
                  </div>
                  {visibleSearchResults.map((result) => (
                    <Link
                      key={`${result.type}-${result.id}`}
                      to={result.path}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border-t border-slate-100 dark:border-zinc-800/50 first:border-0"
                      onClick={() => handleSearchClick({ id: result.id, name: result.name, type: result.type })}
                    >
                      <Search className="h-4 w-4 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium text-slate-900 dark:text-zinc-100">{result.name}</div>
                          {isAdminLike && isHidden(result.type, result.id) && (
                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hidden by current user</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 capitalize">{result.matchedOn}</div>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-zinc-500">{result.description}</p>
                      </div>
                    </Link>
                  ))}
                  {hiddenSearchResultsCount > 0 && !isAdminLike && (
                    <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-zinc-800/50 dark:text-zinc-400">
                      Some hidden results were excluded. Manage Hidden Items in Profile.
                    </div>
                  )}
                  {visibleSearchResults.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Browse Domains */}
      <div className="px-4 pb-2">
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
          {visibleDomains.map(domain => (
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

      {/* Categories (if domain selected) */}
      {visibleCategories.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
            {visibleCategories.map(category => (
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
      <div className="px-4 pb-2">
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
          {visibleMarkerFilters.map(marker => (
            <div key={marker} className="relative">
              <button
                onClick={() => setOpenMarkerMenu(openMarkerMenu === marker ? null : marker)}
                className={cn(
                  "whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                  activeMarker === marker 
                    ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/30 shadow-sm" 
                    : "bg-white/50 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-300"
                )}
              >
                {marker}
              </button>
              {openMarkerMenu === marker && (
                <div className="absolute left-0 top-8 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMarker(activeMarker === marker ? null : marker);
                      setOpenMarkerMenu(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {activeMarker === marker ? 'Clear filter' : 'Filter by marker'}
                  </button>
                  <HideItemButton id={`marker:${marker}`} name={marker} type="tag" tagType="Marker" onHidden={() => setOpenMarkerMenu(null)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Type Toggles & Advanced Search */}
      {activeTab === 'Substances' && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1 flex-1">
              {TYPE_TAGS.map(type => {
                const isActive = activeTypes.includes(type.full);
                const isPrioritized = prioritizedTypes.includes(type.full);
                return (
                  <button
                    key={type.full}
                    onClick={() => toggleType(type.full)}
                    onContextMenu={(e) => togglePriority(e, type.full)}
                    title="Right-click to prioritize"
                    className={cn(
                      "whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5",
                      isActive 
                        ? isPrioritized 
                          ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 shadow-sm"
                          : "bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-300 dark:border-zinc-600 shadow-sm"
                        : "bg-slate-50/50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-600 border-slate-200 dark:border-zinc-800/50 opacity-60"
                    )}
                  >
                    <span>{type.emoji}</span>
                    <span>{type.label}</span>
                    {isPrioritized && <Star size={10} className="fill-current ml-0.5" />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setIsAdvancedSearchOpen(true)}
              className="ml-2 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all border bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center gap-1.5 shadow-sm"
            >
              <Settings2 size={14} />
              Advanced Search
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 px-4 space-y-4">
        {activeTab === 'Stacks' && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsCreateStackOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors shadow-sm"
            >
              <Plus size={16} />
              Create Stack
            </button>
          </div>
        )}

        {activeTab === 'Substances' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSupplements.map(supplement => {
              const isPrioritized = supplement.typeTags.some(t => prioritizedTypes.includes(t));
              return (
                <Link 
                  key={supplement.id}
                  to={`/supplement/${supplement.id}`}
                  onClick={() => handleSearchClick({ id: supplement.id, name: supplement.name, type: 'substance' })}
                  className={cn(
                    "block p-5 rounded-2xl border transition-all group flex flex-col h-full",
                    isPrioritized 
                      ? "bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30 hover:border-emerald-300 dark:hover:border-emerald-700/50 shadow-sm" 
                      : "bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm"
                  )}
                >
                  <div className="flex flex-col mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                        {supplement.name}
                      </h3>
                      <div className="flex gap-1 shrink-0 ml-3 items-start">
                        {!scope.primaryRegion ? (
                          <span className="text-lg" title="Unknown Region">❓</span>
                        ) : (
                          supplement.status.map(st => {
                            const emoji = st.split(' ')[0];
                            return <span key={st} className="text-lg drop-shadow-sm" title={st}>{emoji}</span>;
                          })
                        )}
                        <SecondaryHideMenu id={supplement.id} name={supplement.name} type="substance" />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {supplement.typeTags.map(tag => {
                        const typeInfo = TYPE_TAGS.find(t => t.full === tag);
                        return typeInfo ? (
                          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[11px] font-medium text-slate-600 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-700/50" title={tag}>
                            {typeInfo.emoji} {typeInfo.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-zinc-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
                    {supplement.description}
                  </p>
                  {isAdminLike && isHidden('substance', supplement.id) && (
                    <span className="mb-3 inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hidden by current user</span>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-zinc-800/50">
                    <div className="text-xs font-medium text-slate-500 dark:text-zinc-500">
                      {supplement.accessTag}
                    </div>
                    <div className="flex gap-1.5">
                      {supplement.administration.map(admin => {
                        const emoji = admin.split(' ')[0];
                        return <span key={admin} className="text-base bg-slate-50 dark:bg-zinc-800/50 rounded-md p-1" title={admin}>{emoji}</span>;
                      })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {activeTab === 'Brands' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBrands.map(brand => (
              <Link 
                key={brand.id} 
                to={`/brand/${brand.id}`}
                onClick={() => handleSearchClick({ id: brand.id, name: brand.name, type: 'brand' })}
                className="block p-4 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all group shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{brand.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-500 dark:text-amber-400">
                      <Star size={12} className="fill-amber-500 dark:fill-amber-400" />
                      {brand.userRating}
                    </div>
                    <SecondaryHideMenu id={brand.id} name={brand.name} type="brand" />
                  </div>
                </div>
                {isAdminLike && isHidden('brand', brand.id) && (
                  <span className="mb-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hidden by current user</span>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Activity size={14} />
                    Shipping: {brand.shippingReliability}/5
                  </div>
                  <div className="flex items-center gap-1">
                    <ShieldAlert size={14} className={brand.contaminationReports > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"} />
                    {brand.contaminationReports} Reports
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'Stacks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStacks.filter(s => s.status === 'approved').map(stack => {
              const creator = USERS.find(u => u.id === stack.creatorId);
              return (
                <Link 
                  key={stack.id}
                  to={`/stack/${stack.id}`}
                  onClick={() => handleSearchClick({ id: stack.id, name: stack.name, type: 'stack' })}
                  className="block p-4 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all group shadow-sm flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {stack.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {stack.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                          Pending Review
                        </span>
                      )}
                      <SecondaryHideMenu id={stack.id} name={stack.name} type="stack" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mb-3 flex-1">
                    {stack.description}
                  </p>
                  {isAdminLike && isHidden('stack', stack.id) && (
                    <span className="mb-2 inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hidden by current user</span>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-zinc-800/50">
                    <div className="text-xs text-slate-500 dark:text-zinc-500">
                      {stack.substances.length} substances
                    </div>
                    {creator && (
                      <div className="text-xs text-slate-500 dark:text-zinc-400">
                        by <span className="font-medium text-slate-700 dark:text-zinc-300">@{creator.username}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Search Modal */}
      <AdvancedSearchModal 
        isOpen={isAdvancedSearchOpen} 
        onClose={() => setIsAdvancedSearchOpen(false)} 
      />

      <CreateStackModal
        isOpen={isCreateStackOpen}
        onClose={() => setIsCreateStackOpen(false)}
      />
    </div>
  );
}
