/*
 * Verifies data-pack JSON files against live NCBI records before import.
 * Shared, parameterized replacement for the per-batch copies that used to
 * live in each batches/<name>/ directory.
 *
 *   node docs/data-packs/verify-pack.mjs batches/<name>            # one pack
 *   node docs/data-packs/verify-pack.mjs --all                     # every pack
 *   node docs/data-packs/verify-pack.mjs --all --write             # backfill year/journal
 *
 * Paths may be a batch directory or a pack.json file, relative to this
 * script's directory or the CWD. Requires normal network access
 * (E-utilities + doi.org) — run it OUTSIDE the restricted session that
 * generated the packs. Exit code 0 = all packs safe to import; 1 = at
 * least one FAIL (title mismatch, retraction, unresolvable id).
 *
 * Also warns (without failing) when the same PMID appears in more than one
 * pack — the importer should treat sources as upserts keyed on PMID, but
 * cross-pack duplicates deserve a human glance.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const HERE = dirname(fileURLToPath(import.meta.url));
const write = process.argv.includes('--write');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));

function resolvePackPath(arg) {
  for (const base of [process.cwd(), HERE]) {
    const p = resolve(base, arg);
    if (existsSync(p)) {
      return statSync(p).isDirectory() ? join(p, 'pack.json') : p;
    }
  }
  throw new Error(`cannot resolve pack path: ${arg}`);
}

let packPaths;
if (process.argv.includes('--all')) {
  const batchesDir = join(HERE, 'batches');
  packPaths = readdirSync(batchesDir)
    .map((d) => join(batchesDir, d, 'pack.json'))
    .filter((p) => existsSync(p))
    .sort();
} else if (args.length) {
  packPaths = args.map(resolvePackPath);
} else {
  console.error('usage: node verify-pack.mjs (<batch-dir-or-pack.json>... | --all) [--write]');
  process.exit(2);
}

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokens = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
const overlap = (a, b) => {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit++;
  return hit / Math.min(ta.size, tb.size);
};

async function esummary(pmid) {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`esummary HTTP ${res.status}`);
  const json = await res.json();
  const rec = json.result?.[pmid];
  if (!rec || rec.error) throw new Error(rec?.error ?? 'no record');
  return rec;
}

async function pmcToPmid(pmcid) {
  const url = `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=${pmcid}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`idconv HTTP ${res.status}`);
  const json = await res.json();
  return json.records?.[0]?.pmid ?? null;
}

async function doiResolves(doi) {
  const res = await fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
    method: 'HEAD',
    redirect: 'manual',
  });
  return res.status >= 300 && res.status < 400;
}

let totalFailures = 0;
const pmidToPacks = new Map();

for (const packPath of packPaths) {
  const pack = JSON.parse(readFileSync(packPath, 'utf8'));
  const results = [];
  let failures = 0;
  console.log(`\n=== ${packPath} ===`);

  for (const src of pack.sources ?? []) {
    if (src.pmid) {
      const list = pmidToPacks.get(src.pmid) ?? [];
      list.push(packPath);
      pmidToPacks.set(src.pmid, list);
    }
    const label = src.pmid ? `PMID ${src.pmid}` : src.doi ? `DOI ${src.doi}` : src.url ?? '(no id)';
    const row = { label, title: src.title, status: 'OK', notes: [] };
    try {
      if (src.pmid) {
        const rec = await esummary(src.pmid);
        const sim = overlap(src.title, rec.title);
        if (sim < 0.7) {
          row.status = 'FAIL';
          row.notes.push(`title mismatch (overlap ${sim.toFixed(2)}): NCBI says "${rec.title}"`);
        }
        const retracted = (rec.references ?? []).some((r) => /retract/i.test(r.reftype ?? ''))
          || /retracted/i.test(rec.title ?? '')
          || (rec.pubtype ?? []).some((t) => /retract/i.test(t));
        if (retracted) {
          row.status = 'FAIL';
          row.notes.push('RETRACTION signal on NCBI record — exclude this source');
        }
        const year = Number((rec.pubdate ?? '').slice(0, 4)) || null;
        const journal = rec.fulljournalname || rec.source || null;
        if (year && !src.year) {
          row.notes.push(`backfill year=${year}`);
          if (write) src.year = year;
        } else if (year && src.year && year !== src.year) {
          row.status = 'FAIL';
          row.notes.push(`year mismatch: pack says ${src.year}, NCBI says ${year}`);
        }
        if (journal && !src.journal_or_site) {
          row.notes.push(`backfill journal="${journal}"`);
          if (write) src.journal_or_site = journal;
        }
        await sleep(350); // E-utilities rate courtesy
      } else if (src.url && /pmc\/articles\/(PMC\d+)/.test(src.url)) {
        const pmcid = src.url.match(/pmc\/articles\/(PMC\d+)/)[1];
        const pmid = await pmcToPmid(pmcid);
        if (pmid) {
          row.notes.push(`resolved ${pmcid} -> PMID ${pmid}; re-run after setting pmid`);
          if (write) src.pmid = String(pmid);
        } else {
          row.notes.push(`${pmcid} did not resolve to a PMID (may be PMC-only)`);
        }
        await sleep(350);
      } else if (src.doi) {
        if (!(await doiResolves(src.doi))) {
          row.status = 'FAIL';
          row.notes.push('DOI did not resolve at doi.org');
        }
      } else {
        row.notes.push('no PMID/DOI/PMC id — manual check required');
      }
      if (src.doi && src.pmid) {
        if (!(await doiResolves(src.doi))) {
          row.status = 'FAIL';
          row.notes.push('DOI did not resolve at doi.org');
        }
      }
    } catch (err) {
      row.status = 'FAIL';
      row.notes.push(`lookup error: ${err.message}`);
    }
    if (row.status === 'FAIL') failures++;
    results.push(row);
  }

  // Findings must reference a source in this pack.
  const ids = new Set();
  for (const s of pack.sources ?? []) {
    if (s.pmid) ids.add(`pmid:${s.pmid}`);
    if (s.doi) ids.add(`doi:${s.doi}`);
    if (s.url) ids.add(`url:${s.url}`);
  }
  for (const f of pack.findings ?? []) {
    const key = f.source_pmid ? `pmid:${f.source_pmid}` : f.source_doi ? `doi:${f.source_doi}` : `url:${f.source_url}`;
    if (!ids.has(key)) {
      failures++;
      results.push({ label: key, title: f.endpoint, status: 'FAIL', notes: ['finding references no source in this pack'] });
    }
  }

  for (const r of results) {
    const mark = r.status === 'OK' ? '  OK ' : ' FAIL';
    console.log(`${mark} ${r.label} — ${r.title?.slice(0, 70)}`);
    for (const n of r.notes) console.log(`       · ${n}`);
  }
  console.log(`${results.length} checks, ${failures} failure(s).`);
  if (write) {
    writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n');
    console.log('pack.json updated with backfills.');
  }
  totalFailures += failures;
}

const dupes = [...pmidToPacks.entries()].filter(([, packs]) => packs.length > 1);
if (dupes.length) {
  console.log('\nCross-pack PMID reuse (importer should upsert; review intent):');
  for (const [pmid, packs] of dupes) console.log(`  PMID ${pmid}: ${packs.length} packs`);
}

console.log(`\n${packPaths.length} pack(s), ${totalFailures} total failure(s).`);
if (totalFailures > 0) {
  console.log('DO NOT IMPORT until failures are resolved.');
  process.exit(1);
}
console.log('All packs verified — safe to drop into Admin -> Research.');
