/**
 * pragma service worker — caches the application shell, the songs
 * catalog, and the next session's setlist for offline read.
 *
 *  - Precache the application shell on install.
 *  - Stale-while-revalidate for `/api/songs` and the next session's
 *    setlist endpoints — these are the offline read use cases from the
 *    spec.
 *  - Network-only for every mutation (`POST`, `PUT`, `DELETE`) — the
 *    spec is explicit that v1 has no offline writes.
 *
 * The cache name carries a version suffix so the activate handler can
 * clear stale caches when the SW is updated.
 */

const CACHE_VERSION = 'pragma-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)),
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
  // Cache the catalog endpoints + every setlist read. Mutations and
  // auth-mutating endpoints are explicitly excluded.
  if (pathname === '/api/songs') return true;
  if (/^\/api\/songs\/[\w-]+$/.test(pathname)) return true;
  if (pathname === '/api/sessions') return true;
  if (/^\/api\/sessions\/[\w-]+$/.test(pathname)) return true;
  if (/^\/api\/setlists\/by-session\/[\w-]+$/.test(pathname)) return true;
  if (/^\/api\/setlists\/[\w-]+\/entries$/.test(pathname)) return true;
  if (pathname === '/api/instruments') return true;
  if (pathname === '/api/members') return true;
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
