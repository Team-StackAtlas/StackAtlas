/*
 * Verifies pack.json against live NCBI records before import.
 *
 *   node verify-pack.mjs            # verify, print report
 *   node verify-pack.mjs --write    # also backfill missing year/journal into pack.json
 *
 * Requires normal network access (E-utilities + doi.org). Run it OUTSIDE the
 * restricted session that generated the pack. Exit code 0 = safe to import;
 * 1 = at least one FAIL (title mismatch, retraction, unresolvable id).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PACK_PATH = new URL('./pack.json', import.meta.url);
const pack = JSON.parse(readFileSync(PACK_PATH, 'utf8'));
const write = process.argv.includes('--write');

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

const results = [];
let failures = 0;

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

for (const src of pack.sources ?? []) {
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
console.log(`\n${results.length} checks, ${failures} failure(s).`);
if (write) {
  writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n');
  console.log('pack.json updated with backfills.');
}
if (failures > 0) {
  console.log('DO NOT IMPORT until failures are resolved.');
  process.exit(1);
}
console.log('Pack verified — safe to drop pack.json into Admin -> Research.');
