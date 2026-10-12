import { describe, expect, it, vi } from 'vitest';
import {
  buildResponse,
  buildWindowClient,
  type FakeRequest,
  type FakeResponse,
  loadServiceWorker,
} from './service-worker.test-utils';

const ORIGIN = 'https://talos.borso.fr';
const SHELL_CACHE = 'talos-v1-shell';
const DATA_CACHE = 'talos-v1-data';

function serveAlways(
  response: FakeResponse,
): (request: FakeRequest | string) => Promise<FakeResponse> {
  return () => Promise.resolve(response);
}

function failAlways(): Promise<FakeResponse> {
  return Promise.reject(new Error('offline'));
}

describe('sw.js, the worker that ships', () => {
  it('registers the listeners for caching and for push', () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('', 'text/plain')));
    expect([...worker.listeners.keys()].toSorted()).toEqual([
      'activate',
      'fetch',
      'install',
      'notificationclick',
      'push',
    ]);
  });

  it('precaches the shell on install', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('', 'text/plain')));
    await worker.dispatch('install', {});
    expect([...(worker.caches.namedCaches.get(SHELL_CACHE)?.entries.keys() ?? [])]).toEqual([
      '/',
      '/index.html',
      '/manifest.webmanifest',
      '/icons/icon-192.png',
    ]);
  });

  it('deletes the caches of an earlier version on activate', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('', 'text/plain')));
    worker.caches.seed('talos-v0-shell', '/old', buildResponse('', 'text/plain'));
    worker.caches.seed(SHELL_CACHE, '/kept', buildResponse('', 'text/plain'));
    worker.caches.seed(DATA_CACHE, '/api/today', buildResponse('{}', 'application/json'));
    worker.caches.seed('talos-v1-fonts', '/f.woff2', buildResponse('', 'font/woff2'));
    await worker.dispatch('activate', {});
    expect([...worker.caches.namedCaches.keys()]).toEqual([
      SHELL_CACHE,
      DATA_CACHE,
      'talos-v1-fonts',
    ]);
  });

  it('answers an API read from the network and keeps a copy', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('{"live":1}', 'application/json')));
    const served = await worker.respondTo({ url: `${ORIGIN}/api/today` });
    expect(served?.body).toBe('{"live":1}');
    expect((await worker.caches.match('/api/today'))?.body).toBe('{"live":1}');
  });

  it('does not keep a failed API answer', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('{}', 'application/json', 401)));
    const served = await worker.respondTo({ url: `${ORIGIN}/api/today` });
    expect(served?.status).toBe(401);
    expect(await worker.caches.match('/api/today')).toBeUndefined();
  });

  it('serves the last API answer when offline, query string included', async () => {
    const worker = loadServiceWorker(failAlways);
    worker.caches.seed(
      DATA_CACHE,
      '/api/graph?date=2020-01-31',
      buildResponse('{"old":1}', 'application/json'),
    );
    const served = await worker.respondTo({ url: `${ORIGIN}/api/graph?date=2020-01-31` });
    expect(served?.body).toBe('{"old":1}');
  });

  it('answers 503 in French when offline with nothing cached', async () => {
    const worker = loadServiceWorker(failAlways);
    const served = await worker.respondTo({ url: `${ORIGIN}/api/todos` });
    expect(served?.status).toBe(503);
    expect(served?.headers.get('content-type')).toBe('application/json');
    expect(served?.body).toContain('Hors ligne');
  });

  it('leaves writes, sign-in and push routes to the network', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('{}', 'application/json')));
    expect(await worker.respondTo({ url: `${ORIGIN}/api/todos`, method: 'POST' })).toBeUndefined();
    expect(await worker.respondTo({ url: `${ORIGIN}/api/auth/login/options` })).toBeUndefined();
    expect(await worker.respondTo({ url: `${ORIGIN}/api/push/public-key` })).toBeUndefined();
  });

  it('answers a navigation from the network and stores it as the entry point', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('<!doctype html>', 'text/html')));
    const served = await worker.respondTo({ url: `${ORIGIN}/todos`, mode: 'navigate' });
    expect(served?.body).toBe('<!doctype html>');
    expect((await worker.caches.match('/index.html'))?.body).toBe('<!doctype html>');
  });

  it('does not store a failed navigation', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('oops', 'text/html', 500)));
    await worker.respondTo({ url: `${ORIGIN}/todos`, mode: 'navigate' });
    expect(await worker.caches.match('/index.html')).toBeUndefined();
  });

  it('opens the cached entry point offline, then the root, then gives up', async () => {
    const worker = loadServiceWorker(failAlways);
    await expect(worker.respondTo({ url: `${ORIGIN}/brain`, mode: 'navigate' })).rejects.toThrow(
      'offline',
    );
    worker.caches.seed(SHELL_CACHE, '/', buildResponse('root', 'text/html'));
    expect((await worker.respondTo({ url: `${ORIGIN}/brain`, mode: 'navigate' }))?.body).toBe(
      'root',
    );
    worker.caches.seed(SHELL_CACHE, '/index.html', buildResponse('entry', 'text/html'));
    expect((await worker.respondTo({ url: `${ORIGIN}/brain`, mode: 'navigate' }))?.body).toBe(
      'entry',
    );
  });

  it('serves a cached asset without a request', async () => {
    const fetchStub = vi.fn(serveAlways(buildResponse('fresh', 'text/javascript')));
    const worker = loadServiceWorker(fetchStub);
    worker.caches.seed(
      SHELL_CACHE,
      '/assets/index-a1.js',
      buildResponse('cached', 'text/javascript'),
    );
    expect((await worker.respondTo({ url: `${ORIGIN}/assets/index-a1.js` }))?.body).toBe('cached');
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('fetches and keeps an asset it does not hold yet, refusing an HTML fallback', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('png', 'image/png')));
    await worker.respondTo({ url: `${ORIGIN}/icons/icon-512.png` });
    expect((await worker.caches.match('/icons/icon-512.png'))?.body).toBe('png');

    const poisoned = loadServiceWorker(serveAlways(buildResponse('<!doctype html>', 'text/html')));
    poisoned.caches.seed(
      SHELL_CACHE,
      '/assets/x.js',
      buildResponse('<!doctype html>', 'text/html'),
    );
    await poisoned.respondTo({ url: `${ORIGIN}/assets/x.js` });
    expect((await poisoned.caches.match('/assets/x.js'))?.body).toBe('<!doctype html>');
    const missing = loadServiceWorker(serveAlways(buildResponse('nope', 'text/plain', 404)));
    await missing.respondTo({ url: `${ORIGIN}/assets/y.js` });
    expect(await missing.caches.match('/assets/y.js')).toBeUndefined();
  });

  it('treats a response without a content type as cacheable', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('bin', null)));
    await worker.respondTo({ url: `${ORIGIN}/assets/z.bin` });
    expect((await worker.caches.match('/assets/z.bin'))?.body).toBe('bin');
  });

  it('keeps the Google fonts after the first load so the type survives offline', async () => {
    const fetchStub = vi.fn(serveAlways(buildResponse('font', 'font/woff2')));
    const worker = loadServiceWorker(fetchStub);
    const fontUrl = 'https://fonts.gstatic.com/s/newsreader/v1/a.woff2';
    expect((await worker.respondTo({ url: fontUrl }))?.body).toBe('font');
    expect((await worker.respondTo({ url: fontUrl }))?.body).toBe('font');
    expect(fetchStub).toHaveBeenCalledOnce();
    expect([...worker.caches.namedCaches.keys()]).toEqual(['talos-v1-fonts']);
  });

  it('does not keep a font the network refused', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('', 'text/plain', 404)));
    await worker.respondTo({ url: 'https://fonts.googleapis.com/css2?family=Newsreader' });
    expect(worker.caches.namedCaches.size).toBe(0);
  });

  it('leaves any other request to the browser', async () => {
    const worker = loadServiceWorker(serveAlways(buildResponse('', 'text/plain')));
    expect(await worker.respondTo({ url: `${ORIGIN}/robots.txt` })).toBeUndefined();
  });
});

function pushData(payload: unknown) {
  return { json: () => payload, text: () => String(payload) };
}

describe('sw.js, push notifications', () => {
  it('shows the title and message of a push, and keeps an urgent one on screen', async () => {
    const worker = loadServiceWorker(failAlways);
    await worker.dispatch('push', {
      data: pushData({
        title: 'Urgent',
        message: 'Appel Acme dans 10 min',
        urgent: true,
        url: '/proposals',
      }),
    });
    expect(worker.notifications).toEqual([
      {
        title: 'Urgent',
        options: {
          body: 'Appel Acme dans 10 min',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          requireInteraction: true,
          data: { url: '/proposals' },
        },
      },
    ]);
  });

  it('lets an ordinary push go away by itself and opens the home screen', async () => {
    const worker = loadServiceWorker(failAlways);
    await worker.dispatch('push', { data: pushData({ body: 'Brief prêt' }) });
    expect(worker.notifications[0]?.title).toBe('Talos');
    expect(worker.notifications[0]?.options).toMatchObject({
      body: 'Brief prêt',
      requireInteraction: false,
      data: { url: '/' },
    });
  });

  it('still notifies for an empty push, a non-object payload or a plain text payload', async () => {
    const worker = loadServiceWorker(failAlways);
    await worker.dispatch('push', { data: null });
    await worker.dispatch('push', { data: pushData(null) });
    await worker.dispatch('push', {
      data: {
        json: () => {
          throw new Error('not json');
        },
        text: () => 'Texte brut',
      },
    });
    expect(worker.notifications.map((notification) => notification.options.body)).toEqual([
      '',
      '',
      'Texte brut',
    ]);
  });

  it('focuses an open window and sends it to the notification URL', async () => {
    const client = buildWindowClient();
    const worker = loadServiceWorker(failAlways, [client]);
    const close = vi.fn();
    await worker.dispatch('notificationclick', {
      notification: { close, data: { url: '/todos' } },
    });
    expect(close).toHaveBeenCalledOnce();
    expect(client.focusCount).toBe(1);
    expect(client.visited).toEqual(['/todos']);
    expect(worker.openedWindows).toEqual([]);
  });

  it('survives a window that refuses to navigate', async () => {
    const client = { ...buildWindowClient() };
    const refusing = {
      ...client,
      focus: () => Promise.resolve(refusing),
      navigate: () => Promise.reject(new Error('uncontrolled')),
    };
    const worker = loadServiceWorker(failAlways, [refusing]);
    await expect(
      worker.dispatch('notificationclick', {
        notification: { close: vi.fn(), data: { url: '/x' } },
      }),
    ).resolves.toBe(refusing);
  });

  it('keeps a focused window that cannot navigate', async () => {
    const bare = { focus: () => Promise.resolve(bare) };
    const worker = loadServiceWorker(failAlways, [bare]);
    await expect(
      worker.dispatch('notificationclick', { notification: { close: vi.fn(), data: {} } }),
    ).resolves.toBe(bare);
  });

  it('opens a new window when none is open, at home when the URL is missing', async () => {
    const worker = loadServiceWorker(failAlways, [{}]);
    await worker.dispatch('notificationclick', { notification: { close: vi.fn() } });
    expect(worker.openedWindows).toEqual(['/']);
  });
});
