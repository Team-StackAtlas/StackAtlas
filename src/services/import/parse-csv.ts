// Minimal RFC-4180-ish CSV row splitter shared by the source/catalog parsers
// and the research-package source-ledger converter. Handles quoted cells,
// escaped quotes, CRLF/LF, and a leading BOM. No header logic — callers map
// columns themselves.

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let quoted = false;
  const input = text.replace(/^\uFEFF/, ''); // strip BOM

  const pushCell = () => {
    row.push(cell);
    cell = '';
  };
  const pushRow = () => {
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      pushCell();
    } else if (char === '\r') {
      if (next === '\n') continue; // let the \n branch close the row
      pushCell();
      pushRow();
    } else if (char === '\n') {
      pushCell();
      pushRow();
    } else {
      cell += char;
    }
  }
  pushCell();
  pushRow();
  return rows;
}
