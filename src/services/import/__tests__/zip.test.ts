import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { extractZip, ZipLimitError, ZIP_MAX_ENTRIES, ZIP_MAX_FILE_BYTES } from '../zip';

function zipFile(entries: Record<string, Uint8Array>, name = 'test.zip'): File {
  return new File([zipSync(entries)], name);
}

describe('extractZip', () => {
  it('extracts supported entries with correct path/name/ext/content', async () => {
    const file = zipFile({
      'notes/a.md': strToU8('# Title\n\nBody text'),
      'b.csv': strToU8('title,source_type\nFoo,other\n'),
    });
    const result = await extractZip(file);

    expect(result.entries).toHaveLength(2);
    const md = result.entries.find((e) => e.name === 'a.md');
    expect(md).toBeDefined();
    expect(md?.path).toBe('notes/a.md');
    expect(md?.ext).toBe('.md');
    expect(md?.content).toContain('Body text');
    expect(result.skipped).toHaveLength(0);
    expect(result.ignored).toHaveLength(0);
  });

  // Scenario 8: unsupported file type inside a ZIP.
  it('skips unsupported file types but still extracts the rest', async () => {
    const file = zipFile({
      'good.md': strToU8('# Good\n\nok'),
      'readme.txt': strToU8('hello'),
      'image.png': strToU8('\x89PNG\r\n'),
    });
    const result = await extractZip(file);

    expect(result.entries.map((e) => e.name)).toEqual(['good.md']);
    const skippedPaths = result.skipped.map((s) => s.path);
    expect(skippedPaths).toContain('readme.txt');
    expect(skippedPaths).toContain('image.png');
    for (const entry of result.skipped) {
      expect(entry.reason).toMatch(/unsupported file type/);
    }
  });

  // Scenario 9: zip-slip attempt (relative traversal and absolute path).
  it('rejects zip-slip paths but still extracts the rest of the archive', async () => {
    const file = zipFile({
      'good.md': strToU8('# Good\n\nok'),
      '../../etc/passwd.md': strToU8('evil'),
      '/etc/passwd2.md': strToU8('evil2'),
    });
    const result = await extractZip(file);

    expect(result.entries.map((e) => e.name)).toEqual(['good.md']);
    expect(result.skipped.length).toBe(2);
    for (const entry of result.skipped) {
      expect(entry.reason).toMatch(/unsafe path/i);
      expect(entry.reason).toMatch(/zip-slip/i);
    }
  });

  // Scenario 10a: too many entries throws ZipLimitError for the whole archive.
  it('throws ZipLimitError when the archive has more entries than the limit', async () => {
    const entries: Record<string, Uint8Array> = {};
    for (let i = 0; i < ZIP_MAX_ENTRIES + 5; i += 1) {
      entries[`f${i}.md`] = strToU8('# x');
    }
    const file = zipFile(entries);

    await expect(extractZip(file)).rejects.toBeInstanceOf(ZipLimitError);
    await expect(extractZip(file)).rejects.toThrow(/more than 300 entries/);
  });

  // Scenario 10b: a single entry over the per-file byte limit throws ZipLimitError.
  it('throws ZipLimitError when a single entry exceeds the per-file byte limit', async () => {
    const bigContent = 'a'.repeat(ZIP_MAX_FILE_BYTES + 1024 * 1024); // ~11MB, highly compressible
    const file = zipFile({ 'big.md': strToU8(bigContent) });

    await expect(extractZip(file)).rejects.toBeInstanceOf(ZipLimitError);
    await expect(extractZip(file)).rejects.toThrow(/exceeds the 10MB per-file limit/);
  }, 20000);

  // Scenario 11: nested archive entry is skipped, not fatal to the rest.
  it('skips a nested archive entry but still extracts the rest', async () => {
    const file = zipFile({
      'good.md': strToU8('# Good\n\nok'),
      'inner.zip': strToU8('fake zip bytes'),
    });
    const result = await extractZip(file);

    expect(result.entries.map((e) => e.name)).toEqual(['good.md']);
    const nested = result.skipped.find((s) => s.path === 'inner.zip');
    expect(nested).toBeDefined();
    expect(nested?.reason).toMatch(/nested/i);
  });

  // Scenario 12: system files are silently ignored, not reported as skipped.
  it('silently ignores __MACOSX/ and .DS_Store entries', async () => {
    const file = zipFile({
      'good.md': strToU8('# Good\n\nok'),
      '__MACOSX/._good.md': strToU8('resource fork junk'),
      '.DS_Store': strToU8('ds store junk'),
    });
    const result = await extractZip(file);

    expect(result.entries.map((e) => e.name)).toEqual(['good.md']);
    expect(result.skipped).toHaveLength(0);
    expect(result.ignored).toContain('__MACOSX/._good.md');
    expect(result.ignored).toContain('.DS_Store');
  });
});
