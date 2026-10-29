/** @Feature shell */

import { createContext, runInContext } from 'node:vm';
import notificationsSource from '../../public/sw-notifications.js?raw';
import serviceWorkerSource from '../../public/sw.js?raw';

const IMPORTED_SCRIPTS = new Map([['/sw-notifications.js', notificationsSource]]);

function readImportedScript(url: string): string {
  const source = IMPORTED_SCRIPTS.get(url);
  if (source === undefined) throw new Error(`sw.js imports ${url}, which is not in public/`);
  return source;
}

export type ServiceWorkerListener = (event: unknown) => void;

export interface FakeNotification {
  readonly title: string;
  readonly options: Record<string, unknown>;
}

export interface FakeWindowClient {
  readonly focus: () => Promise<FakeWindowClient>;
  readonly navigate: (url: string) => Promise<unknown>;
  readonly visited: string[];
  focusCount: number;
}

export interface ServiceWorkerHarness {
  readonly listeners: ReadonlyMap<string, ServiceWorkerListener>;
  readonly caches: FakeCacheStorage;
  readonly notifications: FakeNotification[];
  readonly openedWindows: string[];
  readonly respondTo: (request: FakeRequest) => Promise<FakeResponse | undefined>;
  readonly dispatch: (name: string, event: Record<string, unknown>) => Promise<unknown>;
}

export interface ServiceWorkerSurroundings {
  readonly windowClients?: readonly unknown[];
  readonly language?: string;
}

export function buildWindowClient(): FakeWindowClient {
  const client: FakeWindowClient = {
    visited: [],
    focusCount: 0,
    focus: () => {
      client.focusCount += 1;
      return Promise.resolve(client);
    },
    navigate: (url) => {
      client.visited.push(url);
      return Promise.resolve(client);
    },
  };
  return client;
}

export interface FakeRequest {
  readonly url: string;
  readonly method?: string;
  readonly mode?: string;
}

export interface FakeResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: { get: (name: string) => string | null };
  readonly body: string;
  readonly clone: () => FakeResponse;
}

export function buildResponse(body: string, contentType: string, status = 200): FakeResponse {
  const response: FakeResponse = {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    body,
    clone: () => response,
  };
  return response;
}

class FakeCache {
  readonly entries = new Map<string, FakeResponse>();

  match(key: string | FakeRequest): Promise<FakeResponse | undefined> {
    return Promise.resolve(this.entries.get(keyOf(key)));
  }

  put(key: string | FakeRequest, response: FakeResponse): Promise<void> {
    this.entries.set(keyOf(key), response);
    return Promise.resolve();
  }

  addAll(keys: readonly string[]): Promise<void> {
    for (const key of keys) this.entries.set(key, buildResponse('', 'text/html'));
    return Promise.resolve();
  }
}

export class FakeCacheStorage {
  readonly namedCaches = new Map<string, FakeCache>();

  open(name: string): Promise<FakeCache> {
    const existing = this.namedCaches.get(name) ?? new FakeCache();
    this.namedCaches.set(name, existing);
    return Promise.resolve(existing);
  }

  keys(): Promise<string[]> {
    return Promise.resolve([...this.namedCaches.keys()]);
  }

  delete(name: string): Promise<boolean> {
    return Promise.resolve(this.namedCaches.delete(name));
  }

  match(key: string | FakeRequest): Promise<FakeResponse | undefined> {
    for (const cache of this.namedCaches.values()) {
      const hit = cache.entries.get(keyOf(key));
      if (hit !== undefined) return Promise.resolve(hit);
    }
    return Promise.resolve(undefined);
  }

  seed(cacheName: string, key: string, response: FakeResponse): void {
    const cache = this.namedCaches.get(cacheName) ?? new FakeCache();
    cache.entries.set(key, response);
    this.namedCaches.set(cacheName, cache);
  }
}

const ABSOLUTE_URL_PATTERN = /^https?:\/\//;

function keyOf(key: string | FakeRequest): string {
  const raw = typeof key === 'string' ? key : key.url;
  return ABSOLUTE_URL_PATTERN.test(raw) ? new URL(raw).pathname : raw;
}

export function loadServiceWorker(
  fetchStub: (request: FakeRequest | string) => Promise<FakeResponse>,
  surroundings: ServiceWorkerSurroundings = {},
): ServiceWorkerHarness {
  const listeners = new Map<string, ServiceWorkerListener>();
  const cacheStorage = new FakeCacheStorage();
  const notifications: FakeNotification[] = [];
  const openedWindows: string[] = [];
  const serviceWorkerScope = {
    addEventListener: (name: string, listener: ServiceWorkerListener) => {
      listeners.set(name, listener);
    },
    skipWaiting: () => undefined,
    navigator:
      surroundings.language === undefined ? undefined : { language: surroundings.language },
    registration: {
      showNotification: (title: string, options: Record<string, unknown>) => {
        notifications.push({ title, options });
        return Promise.resolve();
      },
    },
    clients: {
      claim: () => Promise.resolve(),
      matchAll: () => Promise.resolve(surroundings.windowClients ?? []),
      openWindow: (url: string) => {
        openedWindows.push(url);
        return Promise.resolve(null);
      },
    },
  };
  const context = createContext({
    self: serviceWorkerScope,
    caches: cacheStorage,
    fetch: fetchStub,
    importScripts: (...urls: string[]) => {
      for (const url of urls) runInContext(readImportedScript(url), context);
    },
    URL,
    Promise,
    console,
  });
  runInContext(serviceWorkerSource, context);

  const dispatch = async (name: string, event: Record<string, unknown>): Promise<unknown> => {
    const listener = listeners.get(name);
    if (listener === undefined) throw new Error(`the worker registered no ${name} listener`);
    let finished: Promise<unknown> = Promise.resolve();
    listener({
      ...event,
      waitUntil: (work: Promise<unknown>) => {
        finished = work;
      },
    });
    return await finished;
  };

  const respondTo = async (request: FakeRequest): Promise<FakeResponse | undefined> => {
    const fetchListener = listeners.get('fetch');
    if (fetchListener === undefined) throw new Error('the worker registered no fetch listener');
    let answered: Promise<FakeResponse> | undefined;
    fetchListener({
      request: { method: 'GET', mode: 'no-cors', ...request },
      respondWith: (response: Promise<FakeResponse>) => {
        answered = response;
      },
    });
    return answered === undefined ? undefined : await answered;
  };

  return {
    listeners,
    caches: cacheStorage,
    notifications,
    openedWindows,
    respondTo,
    dispatch,
  };
}
