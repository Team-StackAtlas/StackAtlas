import { describe, it, expect } from 'vitest';
import { sourceKeyVariants, validatePack } from '../validate';
import { parseImportFiles } from '../parse';
import type { DataPack, ExistingKeys } from '../types';

function emptyExisting(): ExistingKeys {
  return {
    substanceSlugs: new Set(),
    brandSlugs: new Set(),
    stackSignatures: new Set(),
    sourceKeys: new Set(),
    findingKeys: new Set(),
  };
}

describe('sourceKeyVariants', () => {
  it('emits keys in priority order: pmid, doi, url, content_hash, title+year', () => {
    const keys = sourceKeyVariants({
      pmid: '123',
      doi: '10.1/xyz',
      url: 'https://example.com/x',
      content_hash: 'abc123',
      title: 'Some Title',
      year: 2020,
    });
    expect(keys).toEqual(['p:123', 'd:10.1/xyz', 'u:https://example.com/x', 'h:abc123', 't:some title|2020']);
  });

  it('falls through to the next available identity when earlier ones are missing', () => {
    expect(sourceKeyVariants({ doi: '10.1/xyz', title: 'T', year: 2020 })[0]).toBe('d:10.1/xyz');
    expect(sourceKeyVariants({ url: 'https://example.com/x', title: 'T', year: 2020 })[0]).toBe(
      'u:https://example.com/x',
    );
    expect(sourceKeyVariants({ content_hash: 'abc123', title: 'T', year: 2020 })[0]).toBe('h:abc123');
    expect(sourceKeyVariants({ title: 'T', year: 2020 })[0]).toBe('t:t|2020');
  });
});

// Scenario 5: duplicate re-import via content hash.
describe('duplicate markdown re-import via content_hash', () => {
  it('flags a second identical markdown import within the same pack as duplicate_in_pack', async () => {
    const text = '# Duplicate Note\n\nExact same content both times.';
    const first = await parseImportFiles([new File([text], 'first.md')]);
    const second = await parseImportFiles([new File([text], 'second.md')]);

    const combined: DataPack = {
      kind: 'stackatlas-data-pack',
      schema_version: 1,
      sources: [...(first.pack.sources ?? []), ...(second.pack.sources ?? [])],
    };
    expect(combined.sources).toHaveLength(2);
    expect(combined.sources![0].content_hash).toBe(combined.sources![1].content_hash);

    const report = validatePack(combined, emptyExisting());
    const sourceRows = report.rows.filter((r) => r.entity === 'sources');
    expect(sourceRows).toHaveLength(2);
    expect(sourceRows[0].status).toBe('ready');
    expect(sourceRows[1].status).toBe('duplicate_in_pack');
  });

  it('flags a re-imported markdown file already in the database as exists, via its content_hash', async () => {
    const text = '# Already Imported Note\n\nSame text as before.';
    const reImport = await parseImportFiles([new File([text], 'again.md')]);
    const source = reImport.pack.sources![0];
    expect(source.content_hash).toBeDefined();

    const existing = emptyExisting();
    // Simulate the same document already having been imported previously —
    // the database's natural key set contains its content hash.
    existing.sourceKeys.add(`h:${source.content_hash}`);

    const report = validatePack({ kind: 'stackatlas-data-pack', schema_version: 1, sources: [source] }, existing);
    const sourceRows = report.rows.filter((r) => r.entity === 'sources');
    expect(sourceRows).toHaveLength(1);
    expect(sourceRows[0].status).toBe('exists');
  });
});
