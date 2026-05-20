/**
 * pragma service worker — caches the application shell + a bounded
 * pre-cache list pinned by `/api/offline-manifest` (the catalog, every
 * song detail, and the next-upcoming session + its setlist).
 *
 *  - On install, fetch `/api/offline-manifest` and pre-cache every URL
 *    it lists. Spec Q.O.D. *Offline cache scope* = next session only,
 *    so the cache is intentionally bounded to what the manifest names.
 *  - Stale-while-revalidate for any GET to a path the classifier
 *    accepts — that lets the active session's reads stay fresh while
 *    falling back to cache when offline.
 *  - Network-only for every mutation (POST/PUT/DELETE) — the spec is
 *    explicit that v1 has no offline writes.
 *
 * The cache name carries a version suffix so the activate handler can
 * clear stale caches when the SW is updated. The two-cache split
 * (shell vs data) means SW upgrades blow away stale data without
 * touching the shell.
 */

const CACHE_VERSION = 'pragma-v2';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest'];
const OFFLINE_MANIFEST_URL = '/api/offline-manifest';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(SHELL_CACHE);
      await shellCache.addAll(SHELL_ASSETS);
      // Best-effort: fetch the manifest + pin every URL it lists. If
      // the manifest call fails (e.g. first-install offline), we still
      // ship a working shell — the SWR handler will populate the data
      // cache on subsequent online fetches.
      try {
        const response = await fetch(OFFLINE_MANIFEST_URL, { credentials: 'include' });
        if (response.ok) {
          const manifest = await response.json();
          const urls = [
            manifest.catalogListUrl,
            ...(Array.isArray(manifest.songDetailUrls) ? manifest.songDetailUrls : []),
            manifest.nextSessionUrl,
            manifest.nextSetlistUrl,
          ].filter((url) => typeof url === 'string' && url.length > 0);
          const dataCache = await caches.open(DATA_CACHE);
          await Promise.all(
            urls.map(async (url) => {
              try {
                const cacheResponse = await fetch(url, { credentials: 'include' });
                if (cacheResponse.ok) {
                  await dataCache.put(url, cacheResponse.clone());
                }
              } catch {
                // Per-URL fetch failures are silently skipped — the
                // manifest is a best-effort precache, not a hard
                // contract.
              }
            }),
          );
        }
      } catch {
        // Manifest unreachable; fall back to the SWR runtime path.
      }
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

function isReadableApiPath(pathname) {
  if (pathname === '/api/songs') return true;
  if (/^\/api\/songs\/[\w-]+$/.test(pathname)) return true;
  if (pathname === '/api/sessions') return true;
  if (/^\/api\/sessions\/[\w-]+$/.test(pathname)) return true;
  if (/^\/api\/setlists\/by-session\/[\w-]+$/.test(pathname)) return true;
  if (/^\/api\/setlists\/[\w-]+\/entries$/.test(pathname)) return true;
  if (pathname === '/api/instruments') return true;
  if (pathname === '/api/members') return true;
  if (pathname === '/api/offline-manifest') return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    // Mutations bypass the cache entirely — offline writes are not
    // supported in v1 (see spec §1.4 "Edits made offline? Not
    // supported in v1.").
    return;
  }

  // Application shell: cache-first, fall back to network.
  if (request.mode === 'navigate' || SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request)),
    );
    return;
  }

  // Cached read endpoints: stale-while-revalidate.
  if (url.pathname.startsWith('/api/') && isReadableApiPath(url.pathname)) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached ?? networkPromise;
      }),
    );
    return;
  }

  // Static asset under /assets (Vite's hashed bundle path): cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached !== undefined) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      }),
    );
  }
});
