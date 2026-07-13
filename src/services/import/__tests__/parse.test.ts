import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { parseImportFiles } from '../parse';

const VALID_JSON_PACK = JSON.stringify({
  kind: 'stackatlas-data-pack',
  schema_version: 1,
  substances: [
    {
      slug: 'test-substance',
      name: 'Test Substance',
      classification: 'Everyday',
      description: 'A substance used for testing.',
    },
  ],
});

const VALID_CSV = 'title,source_type,url,year\nA CSV Source,human_study,https://example.com/csv,2019\n';

function file(name: string, content: string): File {
  return new File([content], name);
}

function zipFile(entries: Record<string, Uint8Array>, name = 'batch.zip'): File {
  return new File([zipSync(entries)], name);
}

describe('parseImportFiles', () => {
  // Scenario 1: direct Markdown file import (no zip).
  it('imports a direct Markdown file into a SourcePackRow with hash/raw content set', async () => {
    const text = '# My Research Note\n\nSome findings described here.';
    const result = await parseImportFiles([file('note.md', text)]);

    expect(result.pack.sources).toHaveLength(1);
    const source = result.pack.sources![0];
    expect(source.title).toBe('My Research Note');
    expect(source.raw_content).toBe(text);
    expect(source.file_type).toBe('markdown');
    expect(source.original_filename).toBe('note.md');
    expect(source.import_relative_path).toBe('note.md');
    expect(source.content_hash).toMatch(/^[0-9a-f]{64}$/);

    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatchObject({ name: 'note.md', kind: 'markdown', status: 'parsed' });
  });

  // Scenario 2: direct CSV file import via parseImportFiles.
  it('imports a direct CSV file', async () => {
    const result = await parseImportFiles([file('sources.csv', VALID_CSV)]);

    expect(result.pack.sources).toHaveLength(1);
    expect(result.pack.sources![0]).toMatchObject({
      title: 'A CSV Source',
      source_type: 'human_study',
      url: 'https://example.com/csv',
      year: 2019,
    });
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatchObject({ name: 'sources.csv', kind: 'csv', status: 'parsed' });
  });

  // Scenario 3: direct JSON pack file import via parseImportFiles.
  it('imports a direct JSON pack file', async () => {
    const result = await parseImportFiles([file('pack.json', VALID_JSON_PACK)]);

    expect(result.pack.substances).toHaveLength(1);
    expect(result.pack.substances![0]).toMatchObject({ slug: 'test-substance', name: 'Test Substance' });
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatchObject({ name: 'pack.json', kind: 'json', status: 'parsed' });
  });

  // Scenario 4: mixed ZIP with .md + .csv + .json combines into one pack.
  it('combines a mixed ZIP of markdown, csv, and json into a single pack', async () => {
    const zip = zipFile({
      'a.md': strToU8('# Zip Markdown Note\n\nBody.'),
      'b.csv': strToU8(VALID_CSV),
      'c.json': strToU8(VALID_JSON_PACK),
    });
    const result = await parseImportFiles([zip]);

    expect(result.pack.sources).toHaveLength(2); // markdown + csv
    expect(result.pack.substances).toHaveLength(1); // json
    expect(result.files).toHaveLength(3);
    expect(result.files.every((f) => f.status === 'parsed')).toBe(true);
    expect(result.files.map((f) => f.name).sort()).toEqual(['a.md', 'b.csv', 'c.json']);
  });

  // Scenario 6: a malformed file inside a batch does not discard the valid ones.
  it('isolates a malformed file inside a ZIP batch without discarding valid files', async () => {
    const zip = zipFile({
      'bad.json': strToU8('{ this is not valid json'),
      'good.md': strToU8('# Good Note\n\nBody.'),
      'good.csv': strToU8(VALID_CSV),
    });
    const result = await parseImportFiles([zip]);

    const badFile = result.files.find((f) => f.name === 'bad.json');
    expect(badFile?.status).toBe('error');

    const goodMd = result.files.find((f) => f.name === 'good.md');
    const goodCsv = result.files.find((f) => f.name === 'good.csv');
    expect(goodMd?.status).toBe('parsed');
    expect(goodCsv?.status).toBe('parsed');

    // The combined pack should still contain both good sources; the bad file
    // must not contribute anything and must not block the others.
    expect(result.pack.sources).toHaveLength(2);
    expect(result.pack.substances ?? []).toHaveLength(0);
  });
});
