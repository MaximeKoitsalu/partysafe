/**
 * Shared text-match scoring.
 *
 * Used by SubstancePicker typeahead, synonym lookup, and disambiguation
 * dropdown. Centralized so the matching feels consistent across the app
 * (PLAN.md Eng E31 DRY refactor).
 *
 * Strategy:
 *  - case-insensitive substring with a prefix bonus
 *  - exact match > prefix match > substring match
 *  - shorter haystacks score higher than longer ones at the same kind of match
 *    (so "lsd" outranks "lsd-25 supersaturated solution" when both contain the
 *    query "lsd")
 *
 * Returns -1 when the haystack does not contain the query at all.
 */

export function score(haystack: string, query: string): number {
  if (!query) return -1;
  const h = haystack.toLowerCase();
  const q = query.toLowerCase();
  if (h === q) return 1000;
  if (h.startsWith(q)) return 800 - Math.min(h.length - q.length, 100);
  const idx = h.indexOf(q);
  if (idx === -1) return -1;
  return 500 - idx - Math.min(h.length - q.length, 100);
}

export type Match<T> = { item: T; score: number };

/**
 * Rank a list of items by `getText(item)` match against `query`. Returns up
 * to `limit` items sorted by descending score, dropping non-matches.
 */
export function rankMatches<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
  limit = 8,
): Match<T>[] {
  if (!query.trim()) return [];
  const ranked: Match<T>[] = [];
  for (const item of items) {
    const s = score(getText(item), query);
    if (s >= 0) ranked.push({ item, score: s });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}
