const CACHE_VERSION = 'talos-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const ENTRY_POINT_URL = '/index.html';
const SHELL_ASSETS = ['/', ENTRY_POINT_URL, '/manifest.webmanifest', '/icons/icon-192.png'];
const READ_METHOD = 'GET';
const API_PREFIX = '/api/';
const UNCACHED_API_PREFIXES = ['/api/auth/', '/api/push/'];
const HTML_CONTENT_TYPE = 'text/html';
const OFFLINE_STATUS = 503;
const DEFAULT_NOTIFICATION_TITLE = 'Talos';
const DEFAULT_NOTIFICATION_URL = '/';
const NOTIFICATION_ICON = '/icons/icon-192.png';
const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
const FONT_CACHE = `${CACHE_VERSION}-fonts`;

function isHtmlResponse(response) {
  const contentType = response.headers.get('content-type');
  return contentType !== null && contentType.toLowerCase().startsWith(HTML_CONTENT_TYPE);
}

function isCachedApiPath(pathname) {
  return (
    pathname.startsWith(API_PREFIX) &&
    !UNCACHED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function isFingerprintedAssetPath(pathname) {
  return pathname.startsWith('/assets/') || pathname.startsWith('/icons/');
}

function buildOfflineApiResponse() {
  return new Response(JSON.stringify({ error: 'Hors ligne, et rien en cache pour cet écran.' }), {
    status: OFFLINE_STATUS,
    headers: { 'content-type': 'application/json' },
  });
}

async function networkFirstForApi(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? buildOfflineApiResponse();
  }
}

async function networkFirstForShell(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(ENTRY_POINT_URL, response.clone());
    }
    return response;
  } catch (error) {
    const entryPoint = (await caches.match(ENTRY_POINT_URL)) ?? (await caches.match('/'));
    if (entryPoint !== undefined) return entryPoint;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached !== undefined && !isHtmlResponse(cached)) return cached;
  const response = await fetch(request);
  if (response.ok && !isHtmlResponse(response)) {
    const cache = await caches.open(SHELL_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirstForFonts(request) {
  const cached = await caches.match(request);
  if (cached !== undefined) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(FONT_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![SHELL_CACHE, DATA_CACHE, FONT_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== READ_METHOD) return;
  const url = new URL(request.url);

  if (FONT_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirstForFonts(request));
    return;
  }

  if (isCachedApiPath(url.pathname)) {
    event.respondWith(networkFirstForApi(request));
    return;
  }
  if (url.pathname.startsWith(API_PREFIX)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstForShell(request));
    return;
  }

  if (isFingerprintedAssetPath(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

function readPushPayload(data) {
  if (data === null || data === undefined) return {};
  try {
    const payload = data.json();
    return payload !== null && typeof payload === 'object' ? payload : {};
  } catch {
    return { message: data.text() };
  }
}

function readText(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event.data);
  const title = readText(payload.title, DEFAULT_NOTIFICATION_TITLE);
  event.waitUntil(
    self.registration.showNotification(title, {
      body: readText(payload.message, readText(payload.body, '')),
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      requireInteraction: payload.urgent === true,
      data: { url: readText(payload.url, DEFAULT_NOTIFICATION_URL) },
    }),
  );
});

async function focusOrOpen(targetUrl) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const existing = windows.find((client) => 'focus' in client);
  if (existing === undefined) return self.clients.openWindow(targetUrl);
  const focused = await existing.focus();
  if ('navigate' in focused) await focused.navigate(targetUrl).catch(() => undefined);
  return focused;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  event.waitUntil(focusOrOpen(readText(data.url, DEFAULT_NOTIFICATION_URL)));
});
