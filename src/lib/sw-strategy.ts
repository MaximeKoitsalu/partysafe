/**
 * Service-worker caching strategy decision (PLAN.md Eng Step 6 / F4).
 *
 * This is the pure, tested decision logic. `public/sw.js` mirrors these rules
 * inline (it can't import TS modules). Keeping the rules here lets us lock them
 * with unit tests so a future change to caching behavior is deliberate.
 *
 * partysafe is a HASH-ROUTED SPA: every route (#/combo, #/drug, #/emergency)
 * is served by the same index.html, so there are no per-route URLs to cache.
 * That collapses the strategy to three cases:
 *
 *   - navigation / entry HTML  → network-first (fresh shell when online, so a
 *                                deploy reaches users; cached shell offline)
 *   - mutable data JSON        → network-first (fresh combo/mechanism data when
 *                                online; cached offline). Stale safety content
 *                                only persists while genuinely offline.
 *   - immutable hashed assets  → cache-first (content-hashed filenames never
 *                                change; new deploys emit new URLs)
 *   - everything else same-origin → network-first (safe default)
 *
 * Cross-origin requests are not handled by the SW at all (we have none —
 * CSP is `default-src 'self'`).
 */

export type CacheStrategy = "network-first" | "cache-first";

/**
 * Decide the strategy for a same-origin request.
 *
 * @param pathname  URL pathname (e.g. "/partysafe/assets/index-abc123.js")
 * @param mode      request.mode ("navigate" for top-level navigations)
 */
export function cacheStrategyFor(pathname: string, mode?: string): CacheStrategy {
  if (mode === "navigate") return "network-first";
  // Content-hashed build assets are immutable: cache-first.
  // Vite emits them under /assets/ with an 8-char hash before the extension.
  if (/\/assets\/.+-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/.test(pathname)) {
    // ...except the JSON datasets, which are mutable content even though they
    // live under /assets/. Those must stay network-first so corrected combo /
    // mechanism data reaches users on their next online visit.
    if (pathname.endsWith(".json")) return "network-first";
    return "cache-first";
  }
  // index.html, data files at the root, anything else: network-first.
  return "network-first";
}

/** True if a request should be handled by the SW at all (same-origin GET). */
export function shouldHandle(method: string, sameOrigin: boolean): boolean {
  return method === "GET" && sameOrigin;
}
