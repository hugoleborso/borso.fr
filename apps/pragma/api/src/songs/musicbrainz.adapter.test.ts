/**
 * @vitest-environment node
 */

// @FollowsBlueprint test-node-adapter

import { describe, expect, it, vi } from 'vitest';
import FIXTURE from './__fixtures__/musicbrainz-sample.json';
import {
  type ExternalFetcher,
  type ExternalSearchState,
  lookupExternalRecording,
  lookupExternalRecordingsByIsrc,
  searchExternal,
} from './musicbrainz.adapter';

const RATE_FLOOR_MS = 1_000;
const THROTTLED_STATUS = 503;

function freshState(lastCallAt = 0): ExternalSearchState {
  return { lastCallAt };
}

function respondWith(body: unknown, status = 200): ExternalFetcher {
  return () => Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe('searchExternal', () => {
  it('asks nothing of the service when the query is blank', async () => {
    const fetcher = vi.fn(respondWith(FIXTURE));
    const outcome = await searchExternal('   ', { fetcher, now: () => 0, state: freshState() });
    expect(outcome).toEqual({ kind: 'ok', hits: [] });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('carries the query, the widened limit and the forgiving parser in the URL', async () => {
    const fetcher = vi.fn(respondWith(FIXTURE));
    await searchExternal('Get Lucky', { fetcher, now: () => 0, state: freshState() });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toContain('query=Get%20Lucky');
    expect(url).toContain('limit=25');
    expect(url).toContain('dismax=true');
    expect(init?.headers).toMatchObject({ Accept: 'application/json' });
  });

  it('returns the ranked hits the payload maps to', async () => {
    const outcome = await searchExternal('Get Lucky', {
      fetcher: respondWith(FIXTURE),
      now: () => 0,
      state: freshState(),
    });
    expect(outcome.kind).toBe('ok');
    expect(outcome.kind === 'ok' ? outcome.hits[0]?.title : null).toBe('Get Lucky');
  });

  it('holds no cache of its own, so every call reaches the service', async () => {
    const fetcher = vi.fn(respondWith(FIXTURE));
    const state = freshState();
    await searchExternal('Get Lucky', { fetcher, now: () => 0, state });
    await searchExternal('GET LUCKY', { fetcher, now: () => 0, state });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('holds the call back for exactly the rest of the floor', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(respondWith(FIXTURE));
      const state = freshState(RATE_FLOOR_MS - 1);
      const pending = searchExternal('Get Lucky', { fetcher, now: () => RATE_FLOOR_MS, state });
      await vi.advanceTimersByTimeAsync(0);
      expect(fetcher).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(RATE_FLOOR_MS - 2);
      expect(fetcher).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('schedules no wait at all once the floor has elapsed', async () => {
    vi.useFakeTimers();
    const scheduleWait = vi.spyOn(globalThis, 'setTimeout');
    try {
      const fetcher = vi.fn(respondWith(FIXTURE));
      const state = freshState(0);
      const pending = searchExternal('Get Lucky', { fetcher, now: () => RATE_FLOOR_MS, state });
      await vi.advanceTimersByTimeAsync(0);
      expect(scheduleWait).not.toHaveBeenCalled();
      expect(fetcher).toHaveBeenCalledTimes(1);
      await pending;
    } finally {
      scheduleWait.mockRestore();
      vi.useRealTimers();
    }
  });

  it('reports a throttled upstream as unavailable rather than as an empty result list', async () => {
    const outcome = await searchExternal('Get Lucky', {
      fetcher: respondWith(FIXTURE, THROTTLED_STATUS),
      now: () => 0,
      state: freshState(),
    });
    expect(outcome).toEqual({ kind: 'unavailable', status: THROTTLED_STATUS });
  });

  it('falls back to its own state and clock when the caller names neither', async () => {
    const fetcher = vi.fn(respondWith(FIXTURE));
    const outcome = await searchExternal('Get Lucky', { fetcher });
    expect(outcome.kind).toBe('ok');
  });

  it('falls back to the platform fetch when the caller names no fetcher', async () => {
    const platformFetch = vi.fn(respondWith(FIXTURE));
    vi.stubGlobal('fetch', platformFetch);
    try {
      const outcome = await searchExternal('Around The World', {
        now: () => 0,
        state: freshState(),
      });
      expect(platformFetch).toHaveBeenCalledTimes(1);
      expect(outcome.kind).toBe('ok');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

const RECORDING = {
  id: 'fa28c7e7-a3ea-4f5f-9f5d-3a3f2c2b1a01',
  title: 'Get Lucky',
  length: 369_000,
  'first-release-date': '2013-04-19',
  'artist-credit': [{ name: 'Daft Punk' }],
};

describe('lookupExternalRecording', () => {
  it('asks the service for the one recording the visitor picked', async () => {
    const fetcher = vi.fn(respondWith(RECORDING));
    const outcome = await lookupExternalRecording(RECORDING.id, {
      fetcher,
      now: () => 0,
      state: freshState(),
    });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toContain(RECORDING.id);
    expect(init?.headers).toMatchObject({
      Accept: 'application/json',
      'User-Agent': expect.stringContaining('Pragma'),
    });
    expect(outcome).toEqual({
      kind: 'ok',
      hits: [expect.objectContaining({ mbid: RECORDING.id })],
    });
  });

  it('reports a refused lookup as unavailable rather than as an unknown recording', async () => {
    const outcome = await lookupExternalRecording(RECORDING.id, {
      fetcher: respondWith(RECORDING, THROTTLED_STATUS),
      now: () => 0,
      state: freshState(),
    });
    expect(outcome).toEqual({ kind: 'unavailable', status: THROTTLED_STATUS });
  });

  it('falls back to its own state, clock and fetch when the caller names none', async () => {
    const platformFetch = vi.fn(respondWith(RECORDING));
    vi.stubGlobal('fetch', platformFetch);
    try {
      const outcome = await lookupExternalRecording(RECORDING.id);
      expect(platformFetch).toHaveBeenCalledTimes(1);
      expect(outcome.kind).toBe('ok');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('lookupExternalRecordingsByIsrc', () => {
  const ISRC = 'GBAAW9500189';

  it('asks the service for the recording carrying the isrc the picked track named', async () => {
    const fetcher = vi.fn(respondWith({ recordings: [RECORDING] }));
    const outcome = await lookupExternalRecordingsByIsrc(ISRC, {
      fetcher,
      now: () => 0,
      state: freshState(),
    });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toContain(`/isrc/${ISRC}`);
    expect(url).toContain('artist-credits');
    expect(init?.headers).toEqual({
      Accept: 'application/json',
      'User-Agent': expect.stringContaining('Pragma'),
    });
    expect(outcome).toEqual({
      kind: 'ok',
      hits: [expect.objectContaining({ mbid: RECORDING.id })],
    });
  });

  it('answers no hit for an isrc the service knows no recording for', async () => {
    const outcome = await lookupExternalRecordingsByIsrc(ISRC, {
      fetcher: respondWith({ recordings: [] }),
      now: () => 0,
      state: freshState(),
    });
    expect(outcome).toEqual({ kind: 'ok', hits: [] });
  });

  it('reports a refused lookup as unavailable, which leaves the song without an mbid', async () => {
    const outcome = await lookupExternalRecordingsByIsrc(ISRC, {
      fetcher: respondWith({}, THROTTLED_STATUS),
      now: () => 0,
      state: freshState(),
    });
    expect(outcome).toEqual({ kind: 'unavailable', status: THROTTLED_STATUS });
  });

  it('shares the one-per-second floor with the search, since both reach the same service', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(respondWith({ recordings: [RECORDING] }));
      const state = freshState(RATE_FLOOR_MS - 1);
      const pending = lookupExternalRecordingsByIsrc(ISRC, {
        fetcher,
        now: () => RATE_FLOOR_MS,
        state,
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(fetcher).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(RATE_FLOOR_MS - 1);
      await pending;
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('falls back to its own state, clock and fetch when the caller names none', async () => {
    const platformFetch = vi.fn(respondWith({ recordings: [RECORDING] }));
    vi.stubGlobal('fetch', platformFetch);
    try {
      const outcome = await lookupExternalRecordingsByIsrc(ISRC);
      expect(platformFetch).toHaveBeenCalledTimes(1);
      expect(outcome.kind).toBe('ok');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
