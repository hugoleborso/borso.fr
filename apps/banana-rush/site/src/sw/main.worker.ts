/** @DependsOnExternal browser-service-worker */

import {
  isFingerprintedAssetPath,
  isLiveGamePath,
  isShellRequest,
  SHELL_PATHS,
} from './sw-cache.utils';

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'banana-rush-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ENTRY_POINT_URL = '/index.html';
const READ_METHOD = 'GET';

async function fillShellCache(): Promise<void> {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll([...SHELL_PATHS]);
}

async function forgetEarlierCaches(): Promise<void> {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key)));
}

async function networkFirstFallingBackToShell(request: Request): Promise<Response> {
  try {
    // eslint-disable-next-line borso/no-outbound-call-outside-adapter -- a service worker's fetch handler is itself the network boundary: an adapter it called would run inside this same worker, and the architecture map reads the dependency off the entry point rather than off a file below it
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(ENTRY_POINT_URL, response.clone());
    }
    return response;
  } catch (error) {
    const entryPoint = await caches.match(ENTRY_POINT_URL);
    if (entryPoint === undefined) throw error;
    return entryPoint;
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached !== undefined) return cached;
  // eslint-disable-next-line borso/no-outbound-call-outside-adapter -- a service worker's fetch handler is itself the network boundary: an adapter it called would run inside this same worker, and the architecture map reads the dependency off the entry point rather than off a file below it
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(SHELL_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(fillShellCache());
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(forgetEarlierCaches());
  void self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== READ_METHOD) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isLiveGamePath(url.pathname)) return;

  const isShell = isShellRequest(request.mode, url.pathname);
  if (isShell) {
    event.respondWith(networkFirstFallingBackToShell(request));
    return;
  }

  const isFingerprintedAsset = isFingerprintedAssetPath(url.pathname);
  if (isFingerprintedAsset) {
    event.respondWith(cacheFirst(request));
  }
});
