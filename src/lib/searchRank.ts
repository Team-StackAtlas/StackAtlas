// Ranks how directly a search query matched an entity, so pickers can put
// name matches above things that only matched in a description or a related
// list (pairings, markers). Without this, searching "theanine" buried
// L-Theanine below every substance that merely mentions it.
//
// Higher is better. 0 means the query didn't touch the name or aliases at
// all (the entity presumably matched on some other field, so it still shows,
// just last).
export function searchRank(query: string, name: string, aliases: string[] = []): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const n = name.toLowerCase();

  if (n === q) return 100;
  if (n.startsWith(q)) return 90;
  // A word inside the name starting with the query ("l-theanine" vs "theanine").
  if (n.split(/[^a-z0-9]+/).some((word) => word.startsWith(q))) return 80;
  if (n.includes(q)) return 70;

  let best = 0;
  for (const alias of aliases) {
    const a = alias.toLowerCase();
    if (a === q) best = Math.max(best, 60);
    else if (a.startsWith(q)) best = Math.max(best, 50);
    else if (a.includes(q)) best = Math.max(best, 40);
  }
  return best;
}

// Stable rank-then-keep-order sort for already-filtered result lists.
export function sortByRank<T>(items: T[], rankOf: (item: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index, rank: rankOf(item) }))
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .map(({ item }) => item);
}
