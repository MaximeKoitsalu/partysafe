/*
 * partysafe service worker — runtime caching for offline use.
 *
 * Hash-routed SPA, so there is no per-route precache: caching the shell +
 * hashed assets + data files makes every route work offline. Strategy mirrors
 * src/lib/sw-strategy.ts (which is unit-tested):
 *
 *   - navigation / entry HTML  → network-first  (deploys reach users; offline → cache)
 *   - mutable data JSON        → network-first  (fresh data online; offline → cache)
 *   - immutable hashed assets  → cache-first    (content-hashed; never change)
 *   - other same-origin GET    → network-first
 *
 * No build-time precache manifest needed: the cache populates as the app loads
 * on the first online visit, and serves from cache thereafter. We do NOT
 * auto-reload on update (festival mid-flow disruption) — network-first on the
 * navigation request means users simply get the fresh shell on their next
 * manual reload.
 *
 * Plain JS (not bundled): served at the site root scope. No imports.
 */

// Bump to force a clean cache rebuild on the next activate.
const CACHE_VERSION = "v1";
const CACHE_NAME = `partysafe-${CACHE_VERSION}`;

self.addEventListener("install", (event) => {
  // Activate immediately; we don't precache a fixed list (runtime caching).
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("partysafe-") && k !== CACHE_NAME).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isImmutableAsset(pathname) {
  // /assets/<name>-<8charhash>.<ext>, but NOT .json (datasets are mutable).
  if (!/\/assets\/.+-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/.test(pathname)) return false;
  if (pathname.endsWith(".json")) return false;
  return true;
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    // Navigation offline with nothing cached: fall back to a cached index.html.
    if (request.mode === "navigate") {
      const shell = await cache.match(new URL("index.html", self.registration.scope).href);
      if (shell) return shell;
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // only same-origin

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  if (isImmutableAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(networkFirst(request));
});
