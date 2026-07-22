import { useEffect, useMemo, useState } from 'react';
import { Search, Truck, ShieldAlert, ShieldCheck, Star, Settings2, Plus, Loader2 } from 'lucide-react';
import { USERS, SCOPE_CLASSIFICATIONS, CLASSIFICATIONS, TYPE_TAGS } from '../data/mockData';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useUserScope } from '../context/UserScopeContext';
import { useFilters } from '../context/FilterContext';
import { useFollowing } from '../hooks/useFollowing';
import { useCatalog } from '../context/CatalogContext';
import AdvancedSearchModal from '../components/AdvancedSearchModal';
import CreateStackModal from '../components/CreateStackModal';
import { SecondaryHideMenu } from '../components/SecondaryHideMenu';
import { SectionHeading } from '../components/SectionHeading';
import { SubstanceCard } from '../components/SubstanceCard';
import { TYPE_TAG_ICONS } from '../lib/typeTagIcons';
import { EmptyState } from '../components/EmptyState';
import { useHiddenItems } from '../hooks/useHiddenItems';
import { useAuth } from '../context/AuthContext';
import { BearingCategoryFilter } from '../components/BearingCategoryFilter';
import { BEARING_CATEGORIES, getFilterBearings } from '../lib/bearings';

type SearchableType = 'substance' | 'brand' | 'stack';
type RecentSearch = { id: string; name: string; type: SearchableType; timestamp: string };
type SearchResult = RecentSearch & { description: string; path: string; matchedOn: string; tags: string[] };

const RECENT_SEARCHES_STORAGE_KEY = 'stackatlas.recentSearches';
// Client-side "Load more" batch size. Keeps the initial render light even
// when the catalog holds hundreds of substances, while still showing the
// full ~17-item seed catalog in one page.
const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 200;

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function searchMatches(query: string, fields: (string | undefined)[]) {
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

function LoadMoreButton({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={onClick}
        className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Load {Math.min(PAGE_SIZE, remaining)} more &middot; {remaining} remaining
      </button>
    </div>
  );
}

export default function Map() {
  const { substances: SUPPLEMENTS, brands: BRANDS, stacks: STACKS, loading: catalogLoading } = useCatalog();
  const { scope } = useUserScope();
  const {
    activeTypes,
    prioritizedTypes,
    activeAdmins,
    activeClassifications,
    toggleType,
    togglePriority
  } = useFilters();
  const visibleClassifications = scope.accessLevel
    ? SCOPE_CLASSIFICATIONS[scope.accessLevel]
    : CLASSIFICATIONS;
  const { isFollowing } = useFollowing();
  const { user } = useAuth();
  const isAdminLike = user?.role === 'Admin' || user?.role === 'Developer';
  const { isHidden, hasHiddenTag } = useHiddenItems();

  const [feedType, setFeedType] = useState<'For You' | 'Following'>('For You');
  const [activeTab, setActiveTab] = useState<'Substances' | 'Brands' | 'Stacks'>('Substances');
  const [searchParams] = useSearchParams();
  const [activeCategoryGroup, setActiveCategoryGroup] = useState<string | null>(() => {
    const requested = searchParams.get('category');
    return requested && BEARING_CATEGORIES.some(category => category.name === requested) ? requested : null;
  });
  const [activeBearings, setActiveBearings] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => readRecentSearches());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [isCreateStackOpen, setIsCreateStackOpen] = useState(false);

  const activeCategoryBearings = activeCategoryGroup ? BEARING_CATEGORIES.find(category => category.name === activeCategoryGroup)?.bearings ?? [] : [];

  // Debounce the query that drives grid filtering so filtering doesn't run on
  // every keystroke against a catalog that can hold hundreds of substances.
  // The quick-jump dropdown below still uses the live `searchQuery`.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Reset how many cards are shown whenever the active tab or any filter
  // changes, so "Load more" always starts back at the first page. Adjusted
  // during render (React's recommended pattern) rather than in an effect, to
  // avoid an extra post-commit render on every filter change.
  const advancedFilterCount = activeClassifications.length + activeAdmins.length;
  const filterKey = [activeTab, feedType, debouncedQuery, activeCategoryGroup, activeBearings.join(','), activeTypes.join(','), activeClassifications.join(','), activeAdmins.join(',')].join('|');
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

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
        ...(supplement.aliases || []),
        supplement.description,
        supplement.classification,
        ...supplement.paths.flatMap((path) => [path.domain, path.category]),
        ...supplement.typeTags,
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
        path: `/substance/${supplement.id}`,
        matchedOn: 'Substance',
        tags: [...supplement.paths.flatMap((path) => [path.domain, path.category]), ...supplement.typeTags, ...(supplement.markers || [])],
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
  }, [searchQuery, SUPPLEMENTS, BRANDS, STACKS]);

  const visibleSearchResults = isAdminLike ? searchResults : searchResults.filter((result) => !isHidden(result.type, result.id) && !hasHiddenTag(result.tags));
  const hiddenSearchResultsCount = searchResults.length - visibleSearchResults.length;

  const filteredSupplements = SUPPLEMENTS.filter(s => {
    if (!isAdminLike && (isHidden('substance', s.id) || hasHiddenTag([...s.paths.flatMap(p => [p.domain, p.category]), ...s.typeTags, ...(s.markers || [])]))) return false;
    // Feed Type Filtering
    if (feedType === 'Following' && !isFollowing('substance', s.id)) return false;

    // Scope ceiling: classification must be visible at the current research scope
    if (!visibleClassifications.includes(s.classification)) return false;

    if (activeCategoryGroup) {
      const selected = activeBearings.length > 0 ? activeBearings : activeCategoryBearings;
      const entityBearings = getFilterBearings([...s.paths.map(p => p.category), ...(s.markers || [])]);
      if (!selected.some(bearing => entityBearings.includes(bearing))) return false;
    }

    // Positive filters: an empty selection means "no filter". A non-empty
    // selection narrows to substances that match at least one chosen value.
    if (activeTypes.length > 0 && !s.typeTags.some(t => activeTypes.includes(t))) return false;

    if (activeClassifications.length > 0 && !activeClassifications.includes(s.classification)) return false;

    if (activeAdmins.length > 0 && !s.administration.some(a => activeAdmins.includes(a))) return false;

    // Search Query Filtering (debounced)
    if (debouncedQuery && !searchMatches(debouncedQuery, [s.name, ...(s.aliases || []), s.description, s.classification, ...s.paths.flatMap(p => [p.domain, p.category]), ...s.typeTags, ...(s.markers || []), ...s.administration])) return false;

    return true;
  }).sort((a, b) => {
    const aPrioritized = a.typeTags.some(t => prioritizedTypes.includes(t));
    const bPrioritized = b.typeTags.some(t => prioritizedTypes.includes(t));
    if (aPrioritized && !bPrioritized) return -1;
    if (!aPrioritized && bPrioritized) return 1;

    if (feedType === 'For You') {
      const aScore = a.typeTags.length + (a.markers?.length || 0);
      const bScore = b.typeTags.length + (b.markers?.length || 0);
      if (aScore !== bScore) return bScore - aScore;
    }

    return 0;
  });

  const filteredBrands = BRANDS.filter(b => {
    if (!isAdminLike && (isHidden('brand', b.id) || hasHiddenTag([...(b.markers || [])]))) return false;
    if (feedType === 'Following' && !isFollowing('brand', b.id)) return false;
    if (activeCategoryGroup) {
      const selected = activeBearings.length > 0 ? activeBearings : activeCategoryBearings;
      const entityBearings = getFilterBearings([...(b.markers || [])]);
      if (entityBearings.length > 0 && !selected.some(bearing => entityBearings.includes(bearing))) return false;
    }
    if (debouncedQuery && !searchMatches(debouncedQuery, [b.name, b.description || '', ...(b.products || []), ...(b.markers || [])])) return false;
    return true;
  });

  const filteredStacks = STACKS.filter(s => {
    if (!isAdminLike && (isHidden('stack', s.id) || hasHiddenTag([...(s.markers || []), ...s.substances.map(substance => substance.name)]))) return false;
    if (feedType === 'Following' && !isFollowing('stack', s.id)) return false;
    if (activeCategoryGroup) {
      const selected = activeBearings.length > 0 ? activeBearings : activeCategoryBearings;
      const entityBearings = getFilterBearings([...(s.markers || [])]);
      if (entityBearings.length > 0 && !selected.some(bearing => entityBearings.includes(bearing))) return false;
    }
    if (debouncedQuery && !searchMatches(debouncedQuery, [s.name, s.description, ...(s.markers || []), ...s.substances.map(substance => substance.name)])) return false;
    return true;
  });
  const approvedStacks = filteredStacks.filter(s => s.status === 'approved');

  const visibleSupplements = filteredSupplements.slice(0, visibleCount);
  const visibleBrands = filteredBrands.slice(0, visibleCount);
  const visibleStacks = approvedStacks.slice(0, visibleCount);

  const hasActiveFilters = Boolean(debouncedQuery) || Boolean(activeCategoryGroup);
  const clearFilters = () => {
    setSearchQuery('');
    setActiveCategoryGroup(null);
    setActiveBearings([]);
  };

  const syncIndicator = catalogLoading ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500">
      <Loader2 size={12} className="animate-spin" /> Syncing catalog&hellip;
    </span>
  ) : undefined;

  const emptyStateFor = (kind: 'substances' | 'brands' | 'stacks') => (
    <EmptyState
      icon={Search}
      title={`No ${kind} match${feedType === 'Following' ? " what you're following" : ' these filters'}`}
      description={
        feedType === 'Following'
          ? `Follow ${kind} to see them here, or switch to For You to browse the full catalog.`
          : 'Try a different search term, or clear your filters to see more.'
      }
      action={hasActiveFilters ? { label: 'Clear filters', onClick: clearFilters } : undefined}
      className="sm:col-span-2 lg:col-span-3 xl:col-span-4"
    />
  );

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
              onClick={() => setActiveTab(tab as 'Substances' | 'Brands' | 'Stacks')}
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
                      to={`/${recent.type === 'substance' ? 'substance' : recent.type}/${recent.id}`}
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

      <BearingCategoryFilter
        selectedCategory={activeCategoryGroup}
        selectedBearings={activeBearings}
        onCategoryChange={(category) => { setActiveCategoryGroup(category); setActiveBearings([]); }}
        onBearingToggle={(bearing) => setActiveBearings((current) => current.includes(bearing) ? current.filter(item => item !== bearing) : [...current, bearing])}
        onReset={() => { setActiveCategoryGroup(null); setActiveBearings([]); }}
      />

      {/* Type Toggles & Advanced Search */}
      {activeTab === 'Substances' && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1 flex-1">
              {TYPE_TAGS.map(type => {
                const isActive = activeTypes.includes(type.full);
                const isPrioritized = prioritizedTypes.includes(type.full);
                const TypeIcon = TYPE_TAG_ICONS[type.full];
                return (
                  <button
                    key={type.full}
                    onClick={() => toggleType(type.full)}
                    onContextMenu={(e) => togglePriority(e, type.full)}
                    title="Click to filter. Right-click to prioritize and sort matching results first."
                    className={cn(
                      "whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5",
                      isActive
                        ? isPrioritized
                          ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 shadow-sm"
                          : "bg-emerald-500 text-white border-emerald-500 shadow-sm dark:bg-emerald-500 dark:border-emerald-500"
                        : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    )}
                  >
                    {TypeIcon && <TypeIcon size={13} />}
                    <span>{type.label}</span>
                    {isPrioritized && <Star size={10} className="fill-current ml-0.5" />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setIsAdvancedSearchOpen(true)}
              className={cn(
                'ml-2 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 shadow-sm',
                advancedFilterCount > 0
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700',
              )}
            >
              <Settings2 size={14} />
              Advanced Search
              {advancedFilterCount > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/25 px-1 text-[10px] font-bold">
                  {advancedFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 px-4 pb-2 space-y-4">
        {activeTab === 'Substances' && (
          <>
            <SectionHeading label="substance" count={filteredSupplements.length} action={syncIndicator} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {visibleSupplements.map(supplement => (
                <SubstanceCard
                  key={supplement.id}
                  supplement={supplement}
                  isPrioritized={supplement.typeTags.some(t => prioritizedTypes.includes(t))}
                  isHiddenByUser={isAdminLike && isHidden('substance', supplement.id)}
                  onClick={() => handleSearchClick({ id: supplement.id, name: supplement.name, type: 'substance' })}
                />
              ))}
              {filteredSupplements.length === 0 && emptyStateFor('substances')}
            </div>
            {visibleSupplements.length < filteredSupplements.length && (
              <LoadMoreButton remaining={filteredSupplements.length - visibleSupplements.length} onClick={() => setVisibleCount(c => c + PAGE_SIZE)} />
            )}
          </>
        )}

        {activeTab === 'Brands' && (
          <>
            <SectionHeading label="brand" count={filteredBrands.length} action={syncIndicator} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {visibleBrands.map(brand => (
                <Link
                  key={brand.id}
                  to={`/brand/${brand.id}`}
                  onClick={() => handleSearchClick({ id: brand.id, name: brand.name, type: 'brand' })}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:shadow-black/30"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="min-w-0 text-[17px] font-bold leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-zinc-50 dark:group-hover:text-emerald-400">{brand.name}</h3>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25">
                        <Star size={12} className="fill-amber-500 dark:fill-amber-400" />
                        {brand.userRating}
                      </span>
                      <SecondaryHideMenu id={brand.id} name={brand.name} type="brand" />
                    </div>
                  </div>
                  {isAdminLike && isHidden('brand', brand.id) && (
                    <span className="mb-2 inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hidden by current user</span>
                  )}
                  <div className="flex-1">
                    {brand.description && (
                      <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-600 dark:text-zinc-400">{brand.description}</p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-zinc-800/60">
                    {brand.contaminationReports > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-red-500 dark:text-red-400">
                        <ShieldAlert size={14} />
                        {brand.contaminationReports} contamination {brand.contaminationReports === 1 ? 'report' : 'reports'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck size={14} />
                        No contamination reports
                      </span>
                    )}
                    <span className="inline-flex shrink-0 items-center gap-1 text-slate-400 dark:text-zinc-500" title={`Shipping reliability ${brand.shippingReliability}/5`}>
                      <Truck size={13} />
                      {brand.shippingReliability}/5
                    </span>
                  </div>
                </Link>
              ))}
              {filteredBrands.length === 0 && emptyStateFor('brands')}
            </div>
            {visibleBrands.length < filteredBrands.length && (
              <LoadMoreButton remaining={filteredBrands.length - visibleBrands.length} onClick={() => setVisibleCount(c => c + PAGE_SIZE)} />
            )}
          </>
        )}

        {activeTab === 'Stacks' && (
          <>
            <SectionHeading
              label="stack"
              count={approvedStacks.length}
              action={
                <div className="flex items-center gap-3">
                  {syncIndicator}
                  <button
                    onClick={() => setIsCreateStackOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors shadow-sm"
                  >
                    <Plus size={16} />
                    Create Stack
                  </button>
                </div>
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {visibleStacks.map(stack => {
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
                    <div className="mb-3 flex-1">
                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                        {stack.description}
                      </p>
                    </div>
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
              {approvedStacks.length === 0 && emptyStateFor('stacks')}
            </div>
            {visibleStacks.length < approvedStacks.length && (
              <LoadMoreButton remaining={approvedStacks.length - visibleStacks.length} onClick={() => setVisibleCount(c => c + PAGE_SIZE)} />
            )}
          </>
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
