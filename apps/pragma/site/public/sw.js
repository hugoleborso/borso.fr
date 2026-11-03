const CACHE_VERSION = 'pragma-v4';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ENTRY_POINT_URL = '/index.html';
const SHELL_ASSETS = ['/', ENTRY_POINT_URL, '/manifest.webmanifest'];
const READ_METHOD = 'GET';
const HTML_CONTENT_TYPE = 'text/html';
const CONTENT_TYPE_PARAMETER_SEPARATOR = ';';

function isHtmlContentType(contentType) {
  if (contentType === null) return false;
  const separatorIndex = contentType.indexOf(CONTENT_TYPE_PARAMETER_SEPARATOR);
  const mediaType = separatorIndex === -1 ? contentType : contentType.slice(0, separatorIndex);
  return mediaType.trim().toLowerCase() === HTML_CONTENT_TYPE;
}

function isHtmlResponse(response) {
  return isHtmlContentType(response.headers.get('content-type'));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(SHELL_CACHE);
      await shellCache.addAll(SHELL_ASSETS);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

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
      if (request.mode === 'navigate') await cache.put(ENTRY_POINT_URL, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached !== undefined) return cached;
    if (request.mode !== 'navigate') throw error;
    const entryPoint = (await caches.match(ENTRY_POINT_URL)) ?? (await caches.match('/'));
    if (entryPoint !== undefined) return entryPoint;
    throw error;
  }
}

function cacheFirst(request) {
  return caches.match(request).then(async (cached) => {
    if (cached !== undefined && !isHtmlResponse(cached)) return cached;
    const response = await fetch(request);
    if (response.ok && !isHtmlResponse(response)) {
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

  if (isFingerprintedAssetPath(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

importScripts('/sw-notifications.js');
