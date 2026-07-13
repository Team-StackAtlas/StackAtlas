// Safe, client-side ZIP extraction for research-corpus uploads.
//
// This app has no custom server component — the real authorization boundary
// for research data has always been the SECURITY DEFINER import RPCs, which
// re-check the caller's stored role before persisting anything (see
// runner.ts / the admin_import_* functions). This module's job is narrower:
// keep the extraction step itself from being a denial-of-service or
// path-traversal vector before any of that content ever reaches validation.
//
// Hard limits below cause the whole archive to be rejected (ZipLimitError) —
// unlike an unsupported file type inside an otherwise-fine archive, a
// bomb/traversal attempt is a property of the archive as a whole and there is
// no safe partial result to salvage.

import { unzipSync } from 'fflate';

export const SUPPORTED_ENTRY_EXTENSIONS = ['.md', '.markdown', '.csv', '.json'] as const;
export type SupportedEntryExtension = (typeof SUPPORTED_ENTRY_EXTENSIONS)[number];

const ARCHIVE_EXTENSIONS = ['.zip', '.tar', '.gz', '.tgz', '.rar', '.7z'];

export const ZIP_MAX_ENTRIES = 300;
export const ZIP_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file
export const ZIP_MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB uncompressed, whole archive
const MAX_COMPRESSION_RATIO = 300; // guards against small-compressed/huge-inflated bombs
const MIN_RATIO_CHECK_BYTES = 4096; // don't ratio-check tiny compressed entries — legitimately high ratio

export interface ZipEntryResult {
  path: string; // original path inside the archive
  name: string; // basename
  ext: string; // lowercased extension including the dot
  content: string; // decoded UTF-8 text
}

export interface ZipSkippedEntry {
  path: string;
  reason: string;
}

export interface ZipExtractionResult {
  entries: ZipEntryResult[];
  skipped: ZipSkippedEntry[]; // unsupported type / nested archive — non-fatal
  ignored: string[]; // system files silently dropped (__MACOSX, .DS_Store, Thumbs.db)
}

export class ZipLimitError extends Error {}

function isSystemFile(path: string): boolean {
  if (path.startsWith('__MACOSX/') || path.includes('/__MACOSX/')) return true;
  const base = path.split('/').pop() ?? path;
  return base === '.DS_Store' || base === 'Thumbs.db';
}

/** Rejects absolute paths, null bytes, and any '..' path segment (zip-slip). */
function isUnsafePath(path: string): boolean {
  if (!path || path.startsWith('/') || path.startsWith('\\')) return true;
  if (path.includes('\0')) return true;
  return path.split(/[/\\]/).some((segment) => segment === '..');
}

function extOf(path: string): string {
  const base = path.split('/').pop() ?? path;
  const dot = base.lastIndexOf('.');
  return dot === -1 ? '' : base.slice(dot).toLowerCase();
}

export async function extractZip(file: File): Promise<ZipExtractionResult> {
  const buffer = new Uint8Array(await file.arrayBuffer());

  const skipped: ZipSkippedEntry[] = [];
  const ignored: string[] = [];
  let consideredCount = 0;
  let totalBytes = 0;
  let limitHit: string | null = null;

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(buffer, {
      filter(entry) {
        if (limitHit) return false;
        const path = entry.name;
        if (path.endsWith('/')) return false; // directory entry, nothing to decode

        if (isSystemFile(path)) {
          ignored.push(path);
          return false;
        }

        consideredCount += 1;
        if (consideredCount > ZIP_MAX_ENTRIES) {
          limitHit = `archive has more than ${ZIP_MAX_ENTRIES} entries`;
          return false;
        }

        if (isUnsafePath(path)) {
          skipped.push({ path, reason: 'unsafe path (rejected for zip-slip protection)' });
          return false;
        }

        const ext = extOf(path);
        if (ARCHIVE_EXTENSIONS.includes(ext)) {
          skipped.push({ path, reason: 'nested archives are not supported' });
          return false;
        }
        if (!(SUPPORTED_ENTRY_EXTENSIONS as readonly string[]).includes(ext)) {
          skipped.push({ path, reason: `unsupported file type (${ext || 'no extension'})` });
          return false;
        }

        if (entry.originalSize > ZIP_MAX_FILE_BYTES) {
          limitHit = `entry "${path}" exceeds the ${ZIP_MAX_FILE_BYTES / (1024 * 1024)}MB per-file limit`;
          return false;
        }
        if (entry.size >= MIN_RATIO_CHECK_BYTES || entry.originalSize >= MIN_RATIO_CHECK_BYTES) {
          const ratio = entry.originalSize / Math.max(entry.size, 1);
          if (ratio > MAX_COMPRESSION_RATIO) {
            limitHit = `entry "${path}" has a suspicious compression ratio (possible archive bomb)`;
            return false;
          }
        }

        totalBytes += entry.originalSize;
        if (totalBytes > ZIP_MAX_TOTAL_BYTES) {
          limitHit = `archive exceeds the ${ZIP_MAX_TOTAL_BYTES / (1024 * 1024)}MB total uncompressed size limit`;
          return false;
        }

        return true;
      },
    });
  } catch (err) {
    if (err instanceof ZipLimitError) throw err;
    throw new Error(`Could not read this ZIP file: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (limitHit) throw new ZipLimitError(limitHit);

  const decoder = new TextDecoder('utf-8', { fatal: false });
  const entries: ZipEntryResult[] = Object.entries(unzipped).map(([path, bytes]) => ({
    path,
    name: path.split('/').pop() ?? path,
    ext: extOf(path),
    content: decoder.decode(bytes),
  }));

  return { entries, skipped, ignored };
}
