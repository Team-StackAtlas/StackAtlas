// Temporary catalog export endpoint (read-only, anon-key scope, whitelisted tables).
const TABLES = new Set([
  'substances',
  'category_routes',
  'substance_routes',
  'type_tags',
  'substance_type_tags',
  'substance_aliases',
]);

const PAGE = 1000;

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    res.status(500).json({ error: 'backend not configured' });
    return;
  }
  const table = String(req.query.table || '');
  if (!TABLES.has(table)) {
    res.status(400).json({ error: 'unknown table' });
    return;
  }

  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const r = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + PAGE - 1}`,
      },
    });
    if (!r.ok) {
      res.status(502).json({ error: `supabase ${r.status}`, detail: await r.text() });
      return;
    }
    const page = await r.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ table, count: rows.length, rows });
}
