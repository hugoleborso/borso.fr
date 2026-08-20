const CACHE_VERSION = 'pragma-v3';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest'];
const OFFLINE_MANIFEST_URL = '/api/offline-manifest';
const READ_METHOD = 'GET';

function listManifestUrls(manifest) {
  return [
    manifest.catalogListUrl,
    ...(Array.isArray(manifest.songDetailUrls) ? manifest.songDetailUrls : []),
    manifest.nextSessionUrl,
    manifest.nextSetlistUrl,
  ].filter((url) => typeof url === 'string' && url.length > 0);
}

async function cacheUrlIfReachable(cache, url) {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (response.ok) {
      await cache.put(url, response.clone());
    }
  } catch {
    return;
  }
}

async function precacheManifestUrlsIfReachable() {
  try {
    const response = await fetch(OFFLINE_MANIFEST_URL, { credentials: 'include' });
    if (!response.ok) return;
    const manifest = await response.json();
    const dataCache = await caches.open(DATA_CACHE);
    await Promise.all(listManifestUrls(manifest).map((url) => cacheUrlIfReachable(dataCache, url)));
  } catch {
    return;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(SHELL_CACHE);
      await shellCache.addAll(SHELL_ASSETS);
      await precacheManifestUrlsIfReachable();
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
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

function isMutation(request) {
  return request.method !== READ_METHOD;
}

function isShellRequest(request, url) {
  return request.mode === 'navigate' || SHELL_ASSETS.includes(url.pathname);
}

function isFingerprintedAssetPath(pathname) {
  return pathname.startsWith('/assets/') || pathname.startsWith('/icons/');
}

async function networkFirstFallingBackToCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached !== undefined) return cached;
    if (request.mode !== 'navigate') throw error;
    const entryPoint = (await caches.match('/index.html')) ?? (await caches.match('/'));
    if (entryPoint !== undefined) return entryPoint;
    throw error;
  }
}

function staleWhileRevalidate(request) {
  return caches.open(DATA_CACHE).then(async (cache) => {
    const cached = await cache.match(request);
    const networkPromise = fetch(request)
      .then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(() => cached);
    return cached ?? networkPromise;
  });
}

function cacheFirst(request) {
  return caches.match(request).then(async (cached) => {
    if (cached !== undefined) return cached;
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (isMutation(request)) return;

  if (isShellRequest(request, url)) {
    event.respondWith(networkFirstFallingBackToCache(request));
    return;
  }

  if (url.pathname.startsWith('/api/') && isReadableApiPath(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (isFingerprintedAssetPath(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
