const CACHE_VERSION = 'pragma-v4';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const ENTRY_POINT_URL = '/index.html';
const SHELL_ASSETS = ['/', ENTRY_POINT_URL, '/manifest.webmanifest'];
const OFFLINE_MANIFEST_URL = '/api/offline-manifest';
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

  if (url.pathname.startsWith('/api/') && isReadableApiPath(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (isFingerprintedAssetPath(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

const NOTIFICATION_TITLE = 'Pragma';
const NOTIFICATION_ICON = '/icons/icon-192.png';
const DEFAULT_NOTIFICATION_URL = '/';
const FRENCH_LANGUAGE_PREFIX = 'fr';
const DEFAULT_DEVICE_LANGUAGE = 'en';
const BAND_TIME_ZONE = 'Europe/Paris';
const SESSION_DATE_FORMAT = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BAND_TIME_ZONE,
};
const PARAMETER_PATTERN = /\{(\w+)\}/g;

const NOTIFICATION_TEXT = {
  en: {
    someone: 'Someone',
    fallback: 'Something changed in the band.',
    templates: {
      'take-created': '{actorName} posted a take of {songTitle}',
      'take-comment-created': '{actorName} commented on a take of {songTitle}',
      'session-created': '{actorName} planned a session on {sessionDate}',
      'session-changed': '{actorName} changed the session on {sessionDate}',
      'setlist-changed': '{actorName} changed the setlist {setlistName}',
      'song-lineup-changed': '{actorName} changed the lineup of {songTitle}',
      'transition-changed': '{actorName} changed the transition {songATitle} → {songBTitle}',
    },
  },
  fr: {
    someone: 'Quelqu’un',
    fallback: 'Du nouveau dans le groupe.',
    templates: {
      'take-created': '{actorName} a publié une prise de {songTitle}',
      'take-comment-created': '{actorName} a commenté une prise de {songTitle}',
      'session-created': '{actorName} a prévu une session le {sessionDate}',
      'session-changed': '{actorName} a modifié la session du {sessionDate}',
      'setlist-changed': '{actorName} a modifié la setlist {setlistName}',
      'song-lineup-changed': '{actorName} a modifié la composition de {songTitle}',
      'transition-changed': '{actorName} a modifié la transition {songATitle} → {songBTitle}',
    },
  },
};

function readText(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readPushPayload(data) {
  if (data === null || data === undefined) return {};
  try {
    const payload = data.json();
    return payload !== null && typeof payload === 'object' ? payload : {};
  } catch {
    return {};
  }
}

function selectLanguage(deviceLanguage) {
  return deviceLanguage.toLowerCase().startsWith(FRENCH_LANGUAGE_PREFIX) ? 'fr' : 'en';
}

function formatSessionDate(value, deviceLanguage) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(deviceLanguage, SESSION_DATE_FORMAT);
}

function readParameters(payload, deviceLanguage, text) {
  const raw =
    payload.parameters !== null && typeof payload.parameters === 'object' ? payload.parameters : {};
  const parameters = {};
  for (const [name, value] of Object.entries(raw)) {
    if (typeof value === 'string') parameters[name] = value;
  }
  parameters.actorName = readText(parameters.actorName, text.someone);
  if (parameters.sessionDate !== undefined) {
    parameters.sessionDate = formatSessionDate(parameters.sessionDate, deviceLanguage);
  }
  return parameters;
}

function renderNotificationBody(payload, deviceLanguage) {
  const text = NOTIFICATION_TEXT[selectLanguage(deviceLanguage)];
  const messageKey = readText(payload.messageKey, '');
  if (!Object.hasOwn(text.templates, messageKey)) return text.fallback;
  const parameters = readParameters(payload, deviceLanguage, text);
  return text.templates[messageKey].replace(PARAMETER_PATTERN, (placeholder, name) =>
    readText(parameters[name], placeholder),
  );
}

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event.data);
  const deviceLanguage = readText(self.navigator?.language, DEFAULT_DEVICE_LANGUAGE);
  const tag = readText(payload.tag, '');
  event.waitUntil(
    self.registration.showNotification(NOTIFICATION_TITLE, {
      body: renderNotificationBody(payload, deviceLanguage),
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      ...(tag.length > 0 ? { tag, renotify: true } : {}),
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
