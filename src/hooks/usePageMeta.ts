import { useEffect } from 'react';

const BASE_TITLE = 'StackAtlas';
const DEFAULT_DESCRIPTION =
  'Community platform for supplements, peptides, and nootropics — verified user reviews, reported dose ranges, and brand reliability ratings.';

/**
 * Sets the document title (and meta description) for a route. CSR-only app:
 * this is the browser-tab/UX layer of SEO, not a crawler solution — see
 * HANDOFF.md §1 for the prerender discussion. Pass an entity name for detail
 * pages ("BPC-157 — StackAtlas"); omit everything to reset to the base title.
 */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = description ?? DEFAULT_DESCRIPTION;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title, description]);
}
