/**
 * @vitest-environment node
 */

// @FollowsBlueprint test-node-adapter

import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ExternalFetcher, resolveSpotifyTrackId, type SpotifyState } from './spotify.adapter';

const ISRC = 'USQX91300108';
const TRACK_ID = '2Foc5Q5nqNiosCNqttzHof';
const PARAMETER_NAME = '/pragma/prod/spotify';
const HOUR_IN_SECONDS = 3_600;

function freshState(): SpotifyState {
  return { token: null, credentials: null };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function tokenThenSearch(trackItems: { id: string }[]): ExternalFetcher {
  return (url) =>
    Promise.resolve(
      url.startsWith('https://accounts.spotify.com')
        ? jsonResponse({ access_token: 'token-1', expires_in: HOUR_IN_SECONDS })
        : jsonResponse({ tracks: { items: trackItems } }),
    );
}

function readsParameter(value: string | undefined) {
  return () => Promise.resolve(value);
}

const refusedTokenThenSearch: ExternalFetcher = (url) =>
  Promise.resolve(
    url.startsWith('https://accounts.spotify.com')
      ? jsonResponse({ access_token: 'refused', expires_in: HOUR_IN_SECONDS }, 400)
      : jsonResponse({ tracks: { items: [{ id: TRACK_ID }] } }),
  );

const tokenThenRefusedSearch: ExternalFetcher = (url) =>
  Promise.resolve(
    url.startsWith('https://accounts.spotify.com')
      ? jsonResponse({ access_token: 'token-1', expires_in: HOUR_IN_SECONDS })
      : jsonResponse({ tracks: { items: [{ id: TRACK_ID }] } }, 429),
  );

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveSpotifyTrackId', () => {
  it('asks nothing when the song carries no usable ISRC, though it could have', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    const fetcher = vi.fn(tokenThenSearch([{ id: TRACK_ID }]));
    expect(await resolveSpotifyTrackId([], { fetcher, state: freshState() })).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('never reads a parameter the environment does not name', async () => {
    const fetcher = vi.fn(tokenThenSearch([{ id: TRACK_ID }]));
    const readParameter = vi.fn(readsParameter('id-1:secret-1'));
    const found = await resolveSpotifyTrackId([ISRC], {
      fetcher,
      state: freshState(),
      readParameter,
    });
    expect(found).toBeNull();
    expect(readParameter).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('asks nothing when the named parameter holds no usable pair', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS_PARAMETER', PARAMETER_NAME);
    const fetcher = vi.fn(tokenThenSearch([{ id: TRACK_ID }]));
    const found = await resolveSpotifyTrackId([ISRC], {
      fetcher,
      state: freshState(),
      readParameter: readsParameter(undefined),
    });
    expect(found).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('reads the credential from the parameter the environment names', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS_PARAMETER', PARAMETER_NAME);
    const readParameter = vi.fn(readsParameter('id-1:secret-1'));
    const found = await resolveSpotifyTrackId([ISRC], {
      fetcher: tokenThenSearch([{ id: TRACK_ID }]),
      state: freshState(),
      readParameter,
    });
    expect(found).toBe(TRACK_ID);
    expect(readParameter).toHaveBeenCalledWith(PARAMETER_NAME);
  });

  it('prefers an inline credential, which is how a developer runs it locally', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    vi.stubEnv('SPOTIFY_CREDENTIALS_PARAMETER', PARAMETER_NAME);
    const readParameter = vi.fn(readsParameter('other:other'));
    const found = await resolveSpotifyTrackId([ISRC], {
      fetcher: tokenThenSearch([{ id: TRACK_ID }]),
      state: freshState(),
      readParameter,
    });
    expect(found).toBe(TRACK_ID);
    expect(readParameter).not.toHaveBeenCalled();
  });

  it('asks for the ISRC as a filter rather than as free text', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    const fetcher = vi.fn(tokenThenSearch([{ id: TRACK_ID }]));
    await resolveSpotifyTrackId([ISRC], { fetcher, state: freshState() });
    const searchCall = fetcher.mock.calls.find(([url]) => url.includes('/v1/search'));
    expect(searchCall?.[0]).toContain(`q=${encodeURIComponent(`isrc:${ISRC}`)}`);
    expect(searchCall?.[0]).toContain('type=track');
    expect(searchCall?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer token-1',
      Accept: 'application/json',
    });
  });

  it('sends the client credentials as basic authorisation, never in the body', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    const fetcher = vi.fn(tokenThenSearch([{ id: TRACK_ID }]));
    await resolveSpotifyTrackId([ISRC], { fetcher, state: freshState() });
    const [, init] = fetcher.mock.calls[0] ?? [];
    const expected = Buffer.from('id-1:secret-1').toString('base64');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      Authorization: `Basic ${expected}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    expect(init?.body).toBe('grant_type=client_credentials');
  });

  it('reuses a token it already holds rather than minting one per song', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    const fetcher = vi.fn(tokenThenSearch([{ id: TRACK_ID }]));
    const state = freshState();
    await resolveSpotifyTrackId([ISRC], { fetcher, state, now: () => 0 });
    await resolveSpotifyTrackId([ISRC], { fetcher, state, now: () => 0 });
    const tokenCalls = fetcher.mock.calls.filter(([url]) =>
      url.startsWith('https://accounts.spotify.com'),
    );
    expect(tokenCalls).toHaveLength(1);
  });

  it('mints a new token once the one it held has expired', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    const fetcher = vi.fn(tokenThenSearch([{ id: TRACK_ID }]));
    const state = freshState();
    await resolveSpotifyTrackId([ISRC], { fetcher, state, now: () => 0 });
    await resolveSpotifyTrackId([ISRC], { fetcher, state, now: () => HOUR_IN_SECONDS * 1_000 });
    const tokenCalls = fetcher.mock.calls.filter(([url]) =>
      url.startsWith('https://accounts.spotify.com'),
    );
    expect(tokenCalls).toHaveLength(2);
  });

  it('reads the credential once, so a warm instance never asks the store twice', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS_PARAMETER', PARAMETER_NAME);
    const readParameter = vi.fn(readsParameter('id-1:secret-1'));
    const state = freshState();
    await resolveSpotifyTrackId([ISRC], {
      fetcher: tokenThenSearch([{ id: TRACK_ID }]),
      state,
      readParameter,
    });
    await resolveSpotifyTrackId([ISRC], {
      fetcher: tokenThenSearch([{ id: TRACK_ID }]),
      state,
      readParameter,
    });
    expect(readParameter).toHaveBeenCalledTimes(1);
  });

  it('answers nothing when the credential is refused, whatever the body carries', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    const found = await resolveSpotifyTrackId([ISRC], {
      fetcher: refusedTokenThenSearch,
      state: freshState(),
    });
    expect(found).toBeNull();
  });

  it('answers nothing when the grant is malformed', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    const found = await resolveSpotifyTrackId([ISRC], {
      fetcher: () => Promise.resolve(jsonResponse({ nothing: 'useful' })),
      state: freshState(),
    });
    expect(found).toBeNull();
  });

  it('answers nothing when the search is refused, even carrying a track it will not use', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    const found = await resolveSpotifyTrackId([ISRC], {
      fetcher: tokenThenRefusedSearch,
      state: freshState(),
    });
    expect(found).toBeNull();
  });

  it('answers nothing when Spotify carries no track for that ISRC', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    const found = await resolveSpotifyTrackId([ISRC], {
      fetcher: tokenThenSearch([]),
      state: freshState(),
    });
    expect(found).toBeNull();
  });

  it('falls back to its own state and clock when the caller names neither', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    const found = await resolveSpotifyTrackId([ISRC], {
      fetcher: tokenThenSearch([{ id: TRACK_ID }]),
    });
    expect(found).toBe(TRACK_ID);
  });

  it('falls back to the platform fetch when the caller names no fetcher', async () => {
    vi.stubEnv('SPOTIFY_CREDENTIALS', 'id-1:secret-1');
    const platformFetch = vi.fn(tokenThenSearch([{ id: TRACK_ID }]));
    vi.stubGlobal('fetch', platformFetch);
    try {
      const found = await resolveSpotifyTrackId([ISRC], { state: freshState() });
      expect(found).toBe(TRACK_ID);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
