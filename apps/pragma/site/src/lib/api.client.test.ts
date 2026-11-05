import { REALTIME_CLIENT_HEADER } from '@domain/stale-scope.core';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  onReadBatchFailed,
  onSessionEnded,
  readTransport,
  REALTIME_CLIENT_ID,
} from './api.client';

function readSentHeader(): string | null {
  const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
  return new Headers(init?.headers).get(REALTIME_CLIENT_HEADER);
}

// @FollowsBlueprint test-pure-unit
describe('the tab id on API calls', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('signs a write with the id this tab drew, so its own socket is not told about it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
    );

    await api.api.tasks.$post({ json: { title: 'Restring the bass' } });

    expect(readSentHeader()).toBe(REALTIME_CLIENT_ID);
    expect(REALTIME_CLIENT_ID).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sends no tab id on a read, which no socket hears about', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
    );

    await api.api.tasks.$get({ query: {} });

    expect(readSentHeader()).toBeNull();
  });
});

function answerBatch(...answers: readonly { status: number; body: unknown }[]): Response {
  return new Response(
    JSON.stringify({
      answers: answers.map((answer) => ({
        status: answer.status,
        contentType: 'application/json',
        body: JSON.stringify(answer.body),
      })),
    }),
    { status: 200 },
  );
}

describe('reads sent through the read batch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    readTransport.reset();
  });

  it('ends the session once when one read of a batch answers that the session is gone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          answerBatch(
            { status: 401, body: { error: 'session-invalid' } },
            { status: 200, body: [] },
          ),
        ),
      ),
    );
    const ended = vi.fn();
    const stopListening = onSessionEnded(ended);

    const [me, songs] = await Promise.all([api.api.me.$get(), api.api.tasks.$get({ query: {} })]);
    stopListening();

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(me.status).toBe(401);
    expect(songs.status).toBe(200);
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('sends the realtime ticket in the same batch as the reads of its tick', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          answerBatch({ status: 200, body: { ticket: 't' } }, { status: 200, body: {} }),
        ),
      ),
    );

    await Promise.all([api.api.realtime.ticket.$get(), api.api.me.$get()]);

    const [input, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(input).toBe('/api/read-batch');
    expect(init?.body).toBe(
      JSON.stringify({
        reads: [
          { path: '/api/realtime/ticket', headers: {} },
          { path: '/api/me', headers: {} },
        ],
      }),
    );
  });

  it('tells the listeners when a batch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 503 }))),
    );
    const failed = vi.fn();
    const stopListening = onReadBatchFailed(failed);

    await Promise.all([api.api.me.$get(), api.api.tasks.$get({ query: {} })]);
    stopListening();

    expect(failed).toHaveBeenCalledWith({ status: 503, size: 2 });
  });
});

const MOUNTED_SONGS = 12;

describe('a live invalidation of every mounted query', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    readTransport.reset();
  });

  it('refetches twelve songs in two batches, never more than two at once', async () => {
    let inFlight = 0;
    let peak = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string, init?: RequestInit) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await Promise.resolve();
        inFlight -= 1;
        const body: unknown = JSON.parse(typeof init?.body === 'string' ? init.body : '{}');
        const reads: unknown =
          typeof body === 'object' && body !== null ? Reflect.get(body, 'reads') : [];
        const count = Array.isArray(reads) ? reads.length : 0;
        return answerBatch(...Array.from({ length: count }, () => ({ status: 200, body: {} })));
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const songIds = Array.from({ length: MOUNTED_SONGS }, (_, index) => `song-${String(index)}`);
    const observers = songIds.map(
      (songId) =>
        new QueryObserver(queryClient, {
          queryKey: ['songs', songId],
          queryFn: async () =>
            await (await api.api.songs[':id'].$get({ param: { id: songId } })).json(),
        }),
    );
    const stopObserving = observers.map((observer) => observer.subscribe(() => undefined));
    await vi.waitFor(() => {
      expect(observers.every((observer) => observer.getCurrentResult().isSuccess)).toBe(true);
    });
    vi.mocked(fetch).mockClear();

    await queryClient.invalidateQueries();

    stopObserving.forEach((stop) => stop());
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    expect(peak).toBeLessThanOrEqual(2);
  });
});

const RETRIED_SONGS = 5;
const SERVICE_UNAVAILABLE = 503;

describe('a batch the API refused, under retry: 1', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    readTransport.reset();
  });

  it('resends its reads once, again as one batch', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const sent: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        sent.push(`${init?.method ?? 'GET'} ${new URL(input, 'http://pragma.test').pathname}`);
        return Promise.resolve(new Response('{}', { status: SERVICE_UNAVAILABLE }));
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
    const songIds = Array.from({ length: RETRIED_SONGS }, (_, index) => `song-${String(index)}`);

    const fetched = songIds.map((songId) =>
      queryClient
        .query({
          queryKey: ['songs', songId],
          queryFn: async () => {
            const response = await api.api.songs[':id'].$get({ param: { id: songId } });
            if (!response.ok) throw new Error(String(response.status));
            return await response.json();
          },
        })
        .catch((error: unknown) => error),
    );
    await vi.runAllTimersAsync();
    await Promise.all(fetched);

    expect(sent).toStrictEqual(['POST /api/read-batch', 'POST /api/read-batch']);
  });
});
