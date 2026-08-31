/**
 * @vitest-environment node
 */

// @FollowsBlueprint test-node-adapter

import { describe, expect, it, vi } from 'vitest';
import { type DeezerFetcher, readDeezerTrack, searchDeezerTracks } from './deezer.adapter';
import { DEEZER_QUOTA_ERROR_CODE } from './deezer.core';

const WONDERWALL_ISRC = 'GBAAW9500189';
const QUOTA_STATUS = 429;
const SERVICE_DOWN_STATUS = 503;
const UNKNOWN_RECORD_CODE = 800;

const TRACK = {
  id: 985745702,
  title: 'Wonderwall',
  title_short: 'Wonderwall',
  isrc: WONDERWALL_ISRC,
  duration: 258,
  artist: { name: 'Oasis' },
  album: { title: "(What's The Story) Morning Glory?" },
};

const REISSUED_TRACK = { ...TRACK, id: 985985832, album: { title: 'Time Flies' } };

function respondWith(body: unknown, status = 200): DeezerFetcher {
  return () => Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe('searchDeezerTracks', () => {
  it('asks nothing of the service when the query is blank', async () => {
    const fetcher = vi.fn(respondWith({ data: [TRACK] }));
    const outcome = await searchDeezerTracks('   ', { fetcher });
    expect(outcome).toEqual({ kind: 'ok', hits: [] });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('carries the query and the limit in the URL, and asks for no key', async () => {
    const fetcher = vi.fn(respondWith({ data: [TRACK] }));
    await searchDeezerTracks('wonderwall oasis', { fetcher });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toContain('q=wonderwall%20oasis');
    expect(url).toContain('limit=25');
    expect(init?.headers).toMatchObject({ Accept: 'application/json' });
    expect(JSON.stringify(init?.headers)).not.toContain('Authorization');
  });

  it('shows one row per recording, so a reissue cannot split the room vote', async () => {
    const outcome = await searchDeezerTracks('wonderwall', {
      fetcher: respondWith({ data: [TRACK, REISSUED_TRACK] }),
    });
    expect(outcome).toEqual({
      kind: 'ok',
      hits: [expect.objectContaining({ trackId: '985745702' })],
    });
  });

  it('reports a refused transport as unavailable rather than as an empty result list', async () => {
    const outcome = await searchDeezerTracks('wonderwall', {
      fetcher: respondWith({ data: [] }, SERVICE_DOWN_STATUS),
    });
    expect(outcome).toEqual({ kind: 'unavailable', status: SERVICE_DOWN_STATUS });
  });

  it('reports a quota refusal stated inside a 200 as unavailable, because it is one', async () => {
    const outcome = await searchDeezerTracks('wonderwall', {
      fetcher: respondWith({ error: { type: 'Exception', code: DEEZER_QUOTA_ERROR_CODE } }),
    });
    expect(outcome).toEqual({ kind: 'unavailable', status: QUOTA_STATUS });
  });

  it('falls back to the platform fetch when the caller names no fetcher', async () => {
    const platformFetch = vi.fn(respondWith({ data: [TRACK] }));
    vi.stubGlobal('fetch', platformFetch);
    try {
      const outcome = await searchDeezerTracks('wonderwall');
      expect(platformFetch).toHaveBeenCalledTimes(1);
      expect(outcome.kind).toBe('ok');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('readDeezerTrack', () => {
  it('reads the one track the visitor picked, so the write never trusts the browser', async () => {
    const fetcher = vi.fn(respondWith(TRACK));
    const outcome = await readDeezerTrack('985745702', { fetcher });
    expect(fetcher.mock.calls[0]?.[0]).toContain('/track/985745702');
    expect(outcome).toEqual({
      kind: 'ok',
      track: expect.objectContaining({ trackId: '985745702', isrc: WONDERWALL_ISRC }),
    });
  });

  it('reads an unknown track as unknown, though the provider answered 200', async () => {
    const outcome = await readDeezerTrack('1', {
      fetcher: respondWith({ error: { type: 'DataException', code: UNKNOWN_RECORD_CODE } }),
    });
    expect(outcome).toEqual({ kind: 'unknown' });
  });

  it('tells a quota refusal apart from an unknown track, though both arrive as a 200', async () => {
    const outcome = await readDeezerTrack('985745702', {
      fetcher: respondWith({ error: { type: 'Exception', code: DEEZER_QUOTA_ERROR_CODE } }),
    });
    expect(outcome).toEqual({ kind: 'unavailable', status: QUOTA_STATUS });
  });

  it('reports a refused transport as unavailable', async () => {
    const outcome = await readDeezerTrack('985745702', {
      fetcher: respondWith(TRACK, SERVICE_DOWN_STATUS),
    });
    expect(outcome).toEqual({ kind: 'unavailable', status: SERVICE_DOWN_STATUS });
  });

  it('falls back to the platform fetch when the caller names no fetcher', async () => {
    const platformFetch = vi.fn(respondWith(TRACK));
    vi.stubGlobal('fetch', platformFetch);
    try {
      const outcome = await readDeezerTrack('985745702');
      expect(platformFetch).toHaveBeenCalledTimes(1);
      expect(outcome.kind).toBe('ok');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
