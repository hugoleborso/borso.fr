import { describe, expect, it, vi } from 'vitest';
import {
  buildResponse,
  loadServiceWorker,
  type FakeRequest,
  type FakeResponse,
} from './service-worker.test-utils';

const SHELL_CACHE = 'pragma-v4-shell';
const ASSET_URL = 'https://pragma.borso.fr/assets/index-Xz6wOtFh.js';
const CATALOG_URL = 'https://pragma.borso.fr/api/songs';

function serveAlways(
  response: FakeResponse,
): (request: FakeRequest | string) => Promise<FakeResponse> {
  return () => Promise.resolve(response);
}

describe('sw.js, the worker that ships', () => {
  it('registers the three listeners a worker needs', () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('', 'text/plain')));
    expect([...worker.listeners.keys()].toSorted()).toEqual(['activate', 'fetch', 'install']);
  });

  it('deletes a cache from an earlier version on activate, which is what unbricks a poisoned client', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('', 'text/plain')));
    worker.caches.seed(
      'pragma-v3-shell',
      '/assets/old.js',
      buildResponse('<!doctype html>', 'text/html'),
    );
    worker.caches.seed(
      SHELL_CACHE,
      '/assets/kept.js',
      buildResponse('export {}', 'text/javascript'),
    );

    const activate = worker.listeners.get('activate');
    let finished: Promise<unknown> = Promise.resolve();
    activate?.({ waitUntil: (work: Promise<unknown>) => (finished = work) });
    await finished;

    expect([...worker.caches.namedCaches.keys()]).toEqual([SHELL_CACHE]);
  });

  it('never stores an asset URL the origin answered with HTML', async () => {
    const fallbackHtml = buildResponse('<!doctype html>', 'text/html; charset=utf-8');
    const worker = loadServiceWorker(serveAlways(fallbackHtml));

    const served = await worker.respondTo({ url: ASSET_URL });

    expect(served?.body).toBe('<!doctype html>');
    expect(await worker.caches.match(ASSET_URL)).toBeUndefined();
  });

  it('refuses to serve an HTML entry a previous version poisoned, and refetches instead', async () => {
    const realBundle = buildResponse('console.log(1)', 'text/javascript');
    const fetchStub = vi.fn(serveAlways(realBundle));
    const worker = loadServiceWorker(fetchStub);
    worker.caches.seed(
      SHELL_CACHE,
      '/assets/index-Xz6wOtFh.js',
      buildResponse('<!doctype html>', 'text/html'),
    );

    const served = await worker.respondTo({ url: ASSET_URL });

    expect(served?.body).toBe('console.log(1)');
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('serves a cached asset without a request, because its name changes when its bytes do', async () => {
    const fetchStub = vi.fn(serveAlways(buildResponse('fresh', 'text/javascript')));
    const worker = loadServiceWorker(fetchStub);
    worker.caches.seed(
      SHELL_CACHE,
      '/assets/index-Xz6wOtFh.js',
      buildResponse('cached', 'text/javascript'),
    );

    const served = await worker.respondTo({ url: ASSET_URL });

    expect(served?.body).toBe('cached');
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('refreshes the entry point on every navigation, so the offline fallback is never the install-time copy', async () => {
    const page = buildResponse('<!doctype html><title>fresh</title>', 'text/html');
    const worker = loadServiceWorker(serveAlways(page));

    await worker.respondTo({ url: 'https://pragma.borso.fr/catalog', mode: 'navigate' });

    const entryPoint = await worker.caches.match('/index.html');
    expect(entryPoint?.body).toBe('<!doctype html><title>fresh</title>');
  });

  it('answers a readable API path from the cache it holds, and leaves a mutation alone', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('[]', 'application/json')));
    worker.caches.seed(
      'pragma-v4-data',
      '/api/songs',
      buildResponse('[{"id":"1"}]', 'application/json'),
    );

    const read = await worker.respondTo({ url: CATALOG_URL });
    const write = await worker.respondTo({ url: CATALOG_URL, method: 'POST' });

    expect(read?.body).toBe('[{"id":"1"}]');
    expect(write).toBeUndefined();
  });

  it('leaves a path it does not know to the network', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('', 'application/json')));

    const served = await worker.respondTo({ url: 'https://pragma.borso.fr/api/auth/login' });

    expect(served).toBeUndefined();
  });
});
