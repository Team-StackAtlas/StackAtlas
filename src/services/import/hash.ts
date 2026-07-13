// SHA-256 content hashing for idempotent re-import of documents that have no
// pmid/doi/url identity (Markdown research notes, etc.) — see sourceKeyVariants
// in validate.ts, which folds this into the same natural-key dedup chain used
// for every other source.

export async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
