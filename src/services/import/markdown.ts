// Best-effort structure extraction from Markdown research documents.
//
// This module only ever reads text with plain string/regex operations — it
// never renders, evaluates, or executes anything in the document (no HTML
// parser, no YAML parser, nothing that follows a link or runs a code block).
// A research corpus is untrusted input, and the only things StackAtlas needs
// from a Markdown file are a research_sources row and, when unambiguous, a
// substance link. Findings still have to be authored deliberately through
// JSON/CSV rows — see docs/data-packs/RESEARCH_INSTRUCTIONS.md's prime
// directive against inventing findings from unstructured prose. Synthesizing
// a direction/dose/endpoint out of freeform text would be exactly that.

import { RESEARCH_SOURCE_TYPES_V1, type ResearchSourceType, type SourcePackRow } from './types';
import { mapSourceType } from './research-package';

export interface SubstanceCatalogEntry {
  slug: string;
  name: string;
  aliases?: string[];
}

export interface MarkdownAmbiguousMatch {
  headingOrTitle: string;
  candidates: string[]; // substance slugs
}

export interface MarkdownExtractionResult {
  source: SourcePackRow;
  ambiguous: MarkdownAmbiguousMatch[];
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const URL_RE = /https?:\/\/[^\s)\]}>"']+/;
const HEADING_RE = /^#{1,3}\s+(.+?)\s*$/gm;
const FOUR_DIGIT_YEAR_RE = /\b(19|20)\d{2}\b/;
const VALID_SOURCE_TYPES = new Set<string>(RESEARCH_SOURCE_TYPES_V1);

/** Parses only flat `key: value` lines. Never interpreted as YAML, never
 * executed — a hostile "value" is just a string that ends up in a Postgres
 * text column and, in the UI, inside a JSX text node (auto-escaped). */
function parseFrontmatter(block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const match = /^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1].toLowerCase();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value) fields[key] = value;
  }
  return fields;
}

function firstParagraph(body: string): string | undefined {
  const paragraph = body
    .replace(HEADING_RE, '')
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .find((p) => p.length > 0);
  if (!paragraph) return undefined;
  return paragraph.replace(/\s+/g, ' ').slice(0, 500);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matchSubstances(
  headingsAndTitle: string[],
  catalog: SubstanceCatalogEntry[],
): { matched: string[]; ambiguous: MarkdownAmbiguousMatch[] } {
  const lookup = new Map<string, string[]>(); // normalized name/alias -> candidate slugs
  for (const entry of catalog) {
    for (const name of [entry.name, ...(entry.aliases ?? [])]) {
      const key = normalize(name);
      if (!key) continue;
      const slugs = lookup.get(key) ?? [];
      if (!slugs.includes(entry.slug)) slugs.push(entry.slug);
      lookup.set(key, slugs);
    }
  }

  const matchedSlugs = new Set<string>();
  const ambiguous: MarkdownAmbiguousMatch[] = [];
  const seenLines = new Set<string>(); // the title is often literally the first heading — check each distinct line once
  for (const line of headingsAndTitle) {
    const key = normalize(line);
    if (!key || seenLines.has(key)) continue;
    seenLines.add(key);
    const slugs = lookup.get(key);
    if (!slugs || slugs.length === 0) continue;
    if (slugs.length === 1) matchedSlugs.add(slugs[0]);
    else ambiguous.push({ headingOrTitle: line, candidates: slugs });
  }
  return { matched: [...matchedSlugs], ambiguous };
}

export function extractMarkdownSource(
  filename: string,
  rawText: string,
  catalog: SubstanceCatalogEntry[] = [],
): MarkdownExtractionResult {
  const frontmatterMatch = FRONTMATTER_RE.exec(rawText);
  const frontmatter = frontmatterMatch ? parseFrontmatter(frontmatterMatch[1]) : {};
  const body = frontmatterMatch ? rawText.slice(frontmatterMatch[0].length) : rawText;

  const headingMatches = [...body.matchAll(HEADING_RE)].map((m) => m[1].trim());
  const baseName = (filename.split('/').pop() ?? filename).replace(/\.(md|markdown)$/i, '');
  const title = frontmatter.title || headingMatches[0] || baseName || 'Untitled document';

  const urlMatch = frontmatter.url || frontmatter.source_url || URL_RE.exec(body)?.[0];
  const dateSource = frontmatter.date || frontmatter.accessed || frontmatter.published || body;
  const yearMatch = FOUR_DIGIT_YEAR_RE.exec(dateSource)?.[0];
  // Prefer an explicit frontmatter source_type; otherwise infer a real
  // category from the document's title and opening text instead of dumping
  // every dropped file into "Other". mapSourceType returns 'other' only when
  // nothing matches, so this is strictly better than the old default.
  const frontmatterSourceType = frontmatter.source_type;
  const sourceType: ResearchSourceType =
    frontmatterSourceType && VALID_SOURCE_TYPES.has(frontmatterSourceType)
      ? (frontmatterSourceType as ResearchSourceType)
      : mapSourceType(`${title}\n${headingMatches.slice(0, 6).join('\n')}\n${body.slice(0, 1500)}`);

  const { matched, ambiguous } = matchSubstances([title, ...headingMatches], catalog);

  const source: SourcePackRow = {
    title,
    source_type: sourceType,
    abstract: firstParagraph(body),
  };
  if (urlMatch) source.url = urlMatch;
  if (yearMatch) source.year = Number(yearMatch);
  if (frontmatter.authors) source.authors = frontmatter.authors;
  if (matched.length > 0) source.substances = matched;

  return { source, ambiguous };
}
