import { describe, expect, it, vi } from 'vitest';
import {
  buildResponse,
  buildWindowClient,
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

function pushData(payload: unknown) {
  return { json: () => payload };
}

function failAlways(): Promise<FakeResponse> {
  return Promise.reject(new Error('offline'));
}

const TAKE_PUSH = {
  messageKey: 'take-created',
  parameters: { actorName: 'Hugo', songTitle: 'Seven Nation Army' },
  url: '/catalog/song-1?take=take-1',
  tag: 'take:take-1',
};

describe('sw.js, push notifications', () => {
  it('renders a take notification in English with its link and its group tag', async () => {
    const worker = loadServiceWorker(failAlways, { language: 'en-GB' });
    await worker.dispatch('push', { data: pushData(TAKE_PUSH) });
    expect(worker.notifications).toEqual([
      {
        title: 'Pragma',
        options: {
          body: 'Hugo posted a take of Seven Nation Army',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'take:take-1',
          renotify: true,
          data: { url: '/catalog/song-1?take=take-1' },
        },
      },
    ]);
  });

  it('renders the same push in French on a French device', async () => {
    const worker = loadServiceWorker(failAlways, { language: 'FR-fr' });
    await worker.dispatch('push', { data: pushData(TAKE_PUSH) });
    expect(worker.notifications[0]?.options.body).toBe(
      'Hugo a publié une prise de Seven Nation Army',
    );
  });

  it('renders every message key the API sends, in both languages', async () => {
    const pushes = [
      ['take-comment-created', { songTitle: 'Song' }],
      ['session-created', { sessionDate: 'not a date' }],
      ['session-changed', { sessionDate: 'not a date' }],
      ['setlist-changed', { setlistName: 'Summer' }],
      ['song-lineup-changed', { songTitle: 'Song' }],
      ['transition-changed', { songATitle: 'One', songBTitle: 'Two' }],
      ['streak-at-risk', { days: '12' }],
      ['streak-band-count', { count: '3' }],
      ['streak-band-count-one', { count: '1' }],
    ] as const;
    const english = loadServiceWorker(failAlways, { language: 'en' });
    const french = loadServiceWorker(failAlways, { language: 'fr' });
    for (const [messageKey, parameters] of pushes) {
      const pushMessage = { messageKey, parameters: { actorName: 'Ana', ...parameters } };
      await english.dispatch('push', { data: pushData(pushMessage) });
      await french.dispatch('push', { data: pushData(pushMessage) });
    }
    expect(english.notifications.map((shown) => shown.options.body)).toEqual([
      'Ana commented on a take of Song',
      'Ana planned a session on not a date',
      'Ana changed the session on not a date',
      'Ana changed the setlist Summer',
      'Ana changed the lineup of Song',
      'Ana changed the transition One → Two',
      'Keep your 12-day flame alive. Log a study before midnight.',
      '3 members already practised today. Your turn?',
      '1 member already practised today. Your turn?',
    ]);
    expect(french.notifications.map((shown) => shown.options.body)).toEqual([
      'Ana a commenté une prise de Song',
      'Ana a prévu une session le not a date',
      'Ana a modifié la session du not a date',
      'Ana a modifié la setlist Summer',
      'Ana a modifié la composition de Song',
      'Ana a modifié la transition One → Two',
      'Garde ta flamme de 12 jours. Note une étude avant minuit.',
      '3 membres ont déjà pratiqué aujourd’hui. À toi ?',
      '1 membre a déjà pratiqué aujourd’hui. À toi ?',
    ]);
  });

  it('writes a session date in the band time zone and the device language', async () => {
    const worker = loadServiceWorker(failAlways, { language: 'en-GB' });
    const sessionDate = '2026-10-24T18:30:00.000Z';
    await worker.dispatch('push', {
      data: pushData({
        messageKey: 'session-created',
        parameters: { actorName: 'Ana', sessionDate },
      }),
    });
    const expectedDate = new Date(sessionDate).toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    });
    expect(worker.notifications[0]?.options.body).toBe(`Ana planned a session on ${expectedDate}`);
    expect(expectedDate).toContain('20:30');
  });

  it('names a former member as someone and keeps a placeholder it has no value for', async () => {
    const worker = loadServiceWorker(failAlways, { language: 'en' });
    await worker.dispatch('push', {
      data: pushData({ messageKey: 'take-created', parameters: { actorName: '', songTitle: 7 } }),
    });
    await worker.dispatch('push', {
      data: pushData({ messageKey: 'take-created', parameters: null }),
    });
    expect(worker.notifications.map((shown) => shown.options.body)).toEqual([
      'Someone posted a take of {songTitle}',
      'Someone posted a take of {songTitle}',
    ]);
  });

  it('falls back to a generic line, in English, for a push it cannot read', async () => {
    const worker = loadServiceWorker(failAlways);
    await worker.dispatch('push', { data: null });
    await worker.dispatch('push', { data: pushData(null) });
    await worker.dispatch('push', { data: pushData({ messageKey: 'templates' }) });
    await worker.dispatch('push', { data: pushData({ messageKey: 'toString' }) });
    await worker.dispatch('push', {
      data: {
        json: () => {
          throw new Error('not json');
        },
      },
    });
    expect(worker.notifications.map((shown) => shown.options.body)).toEqual([
      'Something changed in the band.',
      'Something changed in the band.',
      'Something changed in the band.',
      'Something changed in the band.',
      'Something changed in the band.',
    ]);
    expect(worker.notifications[0]?.options).toEqual({
      body: 'Something changed in the band.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: '/' },
    });
  });

  it('focuses an open window and sends it to the notification URL', async () => {
    const client = buildWindowClient();
    const worker = loadServiceWorker(failAlways, { windowClients: [client] });
    const close = vi.fn();
    await worker.dispatch('notificationclick', {
      notification: { close, data: { url: '/sessions/session-1' } },
    });
    expect(close).toHaveBeenCalledOnce();
    expect(client.focusCount).toBe(1);
    expect(client.visited).toEqual(['/sessions/session-1']);
    expect(worker.openedWindows).toEqual([]);
  });

  it('survives a window that refuses to navigate', async () => {
    const refusing = {
      focus: () => Promise.resolve(refusing),
      navigate: () => Promise.reject(new Error('uncontrolled')),
    };
    const worker = loadServiceWorker(failAlways, { windowClients: [refusing] });
    await expect(
      worker.dispatch('notificationclick', {
        notification: { close: vi.fn(), data: { url: '/setlists/setlist-1' } },
      }),
    ).resolves.toBe(refusing);
  });

  it('keeps a focused window that cannot navigate', async () => {
    const bare = { focus: () => Promise.resolve(bare) };
    const worker = loadServiceWorker(failAlways, { windowClients: [bare] });
    await expect(
      worker.dispatch('notificationclick', { notification: { close: vi.fn(), data: {} } }),
    ).resolves.toBe(bare);
  });

  it('opens a new window when none is open, at home when the URL is missing', async () => {
    const worker = loadServiceWorker(failAlways, { windowClients: [{}] });
    await worker.dispatch('notificationclick', { notification: { close: vi.fn() } });
    await worker.dispatch('notificationclick', {
      notification: { close: vi.fn(), data: { url: '/catalog/song-1' } },
    });
    expect(worker.openedWindows).toEqual(['/', '/catalog/song-1']);
  });
});
