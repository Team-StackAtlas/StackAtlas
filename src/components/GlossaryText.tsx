import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useGlossary } from '../context/GlossaryContext';
import type { GlossaryTerm } from '../services/glossary';

// How many levels of nested popovers stay interactive. At the cap, a
// definition still shows but its inner terms render as plain text.
const MAX_DEPTH = 2;

/**
 * Renders prose with any defined glossary term turned into an interactive
 * mark: hover (or tap) reveals the definition inline — recursively, so terms
 * inside a definition are clickable too — with a link to the full entry.
 * Falls back to plain text when the glossary isn't loaded.
 */
export function GlossaryText({
  children,
  depth = 0,
  skipSlug,
}: {
  children: ReactNode;
  depth?: number;
  skipSlug?: string;
}) {
  const { matcher, byLower } = useGlossary();

  if (typeof children !== 'string' || !matcher || depth > MAX_DEPTH) {
    return <>{children}</>;
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of children.matchAll(matcher)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const term = byLower.get(raw.toLowerCase());
    if (!term || term.slug === skipSlug) continue;

    if (index > lastIndex) nodes.push(children.slice(lastIndex, index));
    nodes.push(<GlossaryMark key={key++} label={raw} term={term} depth={depth} />);
    lastIndex = index + raw.length;
  }

  if (lastIndex === 0) return <>{children}</>;
  if (lastIndex < children.length) nodes.push(children.slice(lastIndex));
  return <>{nodes}</>;
}

function GlossaryMark({ label, term, depth }: { label: string; term: GlossaryTerm; depth: number }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        className="cursor-help border-b border-dotted border-emerald-400/70 font-medium text-emerald-700 decoration-dotted hover:border-emerald-500 dark:border-emerald-500/50 dark:text-emerald-400"
      >
        {label}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1.5 block w-72 max-w-[80vw] cursor-default rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          {term.category && (
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              {term.category}
            </span>
          )}
          <span className="block text-sm font-semibold text-slate-900 dark:text-zinc-100">{term.term}</span>
          <span className="mt-1 block text-[13px] leading-snug text-slate-600 dark:text-zinc-300">
            <GlossaryText depth={depth + 1} skipSlug={term.slug}>
              {term.definition}
            </GlossaryText>
          </span>
          <Link
            to={`/glossary?term=${term.slug}`}
            className="mt-2 inline-block text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            Full entry →
          </Link>
        </span>
      )}
    </span>
  );
}
