import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Beaker, FileText, Layers, Package, Search, X } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { usePosts } from '../context/PostsContext';

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
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { substances, brands, stacks } = useCatalog();
  const { posts } = usePosts();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      // Focus after the overlay renders.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const groups = useMemo<ResultGroup[]>(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    return [
      {
        title: 'Substances',
        icon: Beaker,
        items: substances
          .filter((s) => matches(trimmed, s.name, s.description))
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

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label="Search everything"
      >
        <Search size={14} />
        <span className="hidden md:inline">Search everything…</span>
        <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold md:inline dark:border-zinc-700">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-zinc-800">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search substances, brands, stacks, posts…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              <button onClick={() => setOpen(false)} aria-label="Close search">
                <X size={16} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {query.trim().length < 2 && (
                <p className="p-4 text-center text-sm text-slate-400">
                  Type at least two characters to search everything.
                </p>
              )}
              {query.trim().length >= 2 && groups.length === 0 && (
                <p className="p-4 text-center text-sm text-slate-400">No matches.</p>
              )}
              {groups.map((group) => (
                <div key={group.title} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {group.title}
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => go(item.href)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      <group.icon size={15} className="shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                      {item.sublabel && (
                        <span className="shrink-0 text-xs text-slate-400">{item.sublabel}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
