import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Beaker, CornerDownLeft, FileText, Layers, Package, Search, X } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { usePosts } from '../context/PostsContext';
import { cn } from '../lib/utils';

interface ResultItem {
  key: string;
  label: string;
  sublabel?: string;
  href: string;
}

interface ResultGroup {
  title: string;
  icon: typeof Search;
  items: ResultItem[];
}

function matches(query: string, ...fields: (string | undefined)[]) {
  const needle = query.toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

/**
 * Unified search across substances, brands, stacks, and community posts.
 * Opens with Cmd/Ctrl+K or the header search button; everything is searched
 * client-side from the catalog and posts providers.
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { substances, brands, stacks } = useCatalog();
  const { posts } = usePosts();

  const openSearch = () => {
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuery('');
        setActiveIndex(0);
        setOpen(!open);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Focus the field once the overlay renders.
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const groups = useMemo<ResultGroup[]>(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    return [
      {
        title: 'Substances',
        icon: Beaker,
        items: substances
          .filter((s) => matches(trimmed, s.name, s.description, ...(s.aliases ?? [])))
          .slice(0, 5)
          .map((s) => ({ key: `sub-${s.id}`, label: s.name, sublabel: s.classification, href: `/substance/${s.id}` })),
      },
      {
        title: 'Brands',
        icon: Package,
        items: brands
          .filter((b) => matches(trimmed, b.name, b.description))
          .slice(0, 5)
          .map((b) => ({ key: `brand-${b.id}`, label: b.name, href: `/brand/${b.id}` })),
      },
      {
        title: 'Stacks',
        icon: Layers,
        items: stacks
          .filter((s) => matches(trimmed, s.name, s.description))
          .slice(0, 5)
          .map((s) => ({ key: `stack-${s.id}`, label: s.name, href: `/stack/${s.id}` })),
      },
      {
        title: 'Dispatches & Signals',
        icon: FileText,
        items: posts
          .filter((p) => matches(trimmed, p.title, p.content, p.author.username))
          .slice(0, 5)
          .map((p) => ({ key: `post-${p.id}`, label: p.title, sublabel: `${p.type} · @${p.author.username}`, href: `/post/${p.id}` })),
      },
    ].filter((group) => group.items.length > 0);
  }, [query, substances, brands, stacks, posts]);

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatItems.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % flatItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + flatItems.length) % flatItems.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = flatItems[activeIndex];
      if (item) go(item.href);
    }
  };

  const trimmed = query.trim();

  return (
    <>
      <button
        onClick={openSearch}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 md:px-3"
        aria-label="Search everything"
      >
        <Search size={15} />
        <span className="hidden md:inline">Search everything…</span>
        <kbd className="hidden items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 md:inline-flex dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          ⌘K
        </kbd>
      </button>

      {/* Portaled to <body>: the app header's backdrop-blur creates a stacking
          context that would otherwise trap this fixed overlay beneath other
          sticky bars (e.g. the Square command bar). */}
      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search everything"
          className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/50 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-zinc-800">
              <Search size={18} className="shrink-0 text-slate-400 dark:text-zinc-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
                onKeyDown={onInputKeyDown}
                placeholder="Search substances, brands, stacks, posts…"
                aria-label="Search query"
                className="w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {trimmed.length < 2 && (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
                    <Search size={20} className="text-slate-400 dark:text-zinc-500" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    Keep typing to search…
                  </p>
                </div>
              )}
              {trimmed.length >= 2 && groups.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-slate-600 dark:text-zinc-300">No matches for &ldquo;{trimmed}&rdquo;</p>
                  <p className="mt-1 text-sm text-slate-400 dark:text-zinc-500">Try a different term.</p>
                </div>
              )}
              {groups.map((group) => (
                <div key={group.title} className="mb-1">
                  <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                    <group.icon size={12} />
                    {group.title}
                  </p>
                  {group.items.map((item) => {
                    const index = flatItems.findIndex((flat) => flat.key === item.key);
                    const isActive = index === activeIndex;
                    return (
                      <button
                        key={item.key}
                        ref={(el) => { if (isActive) el?.scrollIntoView({ block: 'nearest' }); }}
                        onClick={() => go(item.href)}
                        onMouseMove={() => setActiveIndex(index)}
                        className={cn(
                          'group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                          isActive ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/60',
                        )}
                      >
                        <span className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          isActive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500',
                        )}>
                          <group.icon size={15} />
                        </span>
                        <span className={cn('min-w-0 flex-1 truncate font-medium', isActive ? 'text-slate-900 dark:text-zinc-50' : 'text-slate-700 dark:text-zinc-200')}>{item.label}</span>
                        {item.sublabel && (
                          <span className="shrink-0 text-xs text-slate-400 dark:text-zinc-500">{item.sublabel}</span>
                        )}
                        <ArrowRight size={15} className={cn('shrink-0 text-emerald-500 transition-opacity', isActive ? 'opacity-100' : 'opacity-0')} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {flatItems.length > 0 && (
              <div className="flex items-center gap-4 border-t border-slate-200 px-4 py-2.5 text-[11px] text-slate-400 dark:border-zinc-800 dark:text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 px-1 py-0.5 font-semibold dark:border-zinc-700">↑</kbd>
                  <kbd className="rounded border border-slate-200 px-1 py-0.5 font-semibold dark:border-zinc-700">↓</kbd>
                  to navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="inline-flex items-center rounded border border-slate-200 px-1 py-0.5 font-semibold dark:border-zinc-700"><CornerDownLeft size={11} /></kbd>
                  to open
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 px-1 py-0.5 font-semibold dark:border-zinc-700">esc</kbd>
                  to close
                </span>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
