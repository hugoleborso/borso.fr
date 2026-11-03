import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { forgetSessionMarker, rememberSessionMarker } from '../session-marker.adapter';
import { authKeys } from './auth.queries';
import { loadOfflineReadingWhenSignedIn, offlineReadingKeys } from './offline-reading.queries';
import { createIsolatedQueryClient, jsonResponse, stubFetch } from './queries.test-utils';
import { setlistKeys } from './setlists.queries';
import { songKeys } from './songs.queries';

const MANIFEST = {
  catalogListUrl: '/api/songs',
  songDetailUrls: ['/api/songs/song-held', '/api/songs/song-missing'],
  nextSessionUrl: '/api/sessions/session-next',
  nextSetlistUrl: '/api/setlists/by-session/session-next',
};

const ANSWERS: Readonly<Record<string, unknown>> = {
  '/api/instruments': { instruments: [] },
  '/api/offline-manifest': MANIFEST,
  '/api/songs': { songs: [] },
  '/api/songs/song-held': { song: { id: 'song-held' } },
  '/api/songs/song-missing': { song: { id: 'song-missing' } },
  '/api/sessions/session-next': { session: { id: 'session-next' } },
  '/api/setlists/by-session/session-next': { setlists: [{ id: 'setlist-next' }] },
  '/api/setlists/setlist-next/entries': { entries: [] },
};

const NOT_FOUND_STATUS = 404;

function answerFromTheTable(): ReturnType<typeof stubFetch> {
  return stubFetch((request) => {
    const path = new URL(request.url).pathname;
    const body = ANSWERS[path];
    return Promise.resolve(
      body === undefined ? jsonResponse({}, NOT_FOUND_STATUS) : jsonResponse(body),
    );
  });
}

function listRequestedPaths(stub: ReturnType<typeof stubFetch>): string[] {
  return stub.calls.map((request) => new URL(request.url).pathname).toSorted();
}

// @FollowsBlueprint test-query-hook
describe('loading what a member reads offline', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    stub?.restore();
    stub = null;
  });

  it('fetches what the cache is missing and leaves what it already holds alone', async () => {
    rememberSessionMarker();
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(authKeys.session(), { authenticated: true });
    queryClient.setQueryData(songKeys.list(), { songs: [] });
    queryClient.setQueryData(songKeys.byId('song-held'), { song: { id: 'song-held' } });
    stub = answerFromTheTable();

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(listRequestedPaths(stub)).toEqual([
      '/api/offline-manifest',
      '/api/sessions/session-next',
      '/api/setlists/by-session/session-next',
      '/api/setlists/setlist-next/entries',
      '/api/songs/song-missing',
    ]);
    expect(queryClient.getQueryData(setlistKeys.entriesOf('setlist-next'))).toEqual({
      entries: [],
    });
  });

  it('probes the session first when the cache holds no answer for it', async () => {
    rememberSessionMarker();
    const queryClient = createIsolatedQueryClient();
    stub = answerFromTheTable();

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(listRequestedPaths(stub)).toContain('/api/instruments');
    expect(listRequestedPaths(stub)).toContain('/api/songs');
  });

  it('sends nothing on a browser that never signed in', async () => {
    forgetSessionMarker();
    const queryClient = createIsolatedQueryClient();
    stub = answerFromTheTable();

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(stub.calls).toEqual([]);
  });

  it('sends nothing once the session has ended', async () => {
    rememberSessionMarker();
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(authKeys.session(), { authenticated: false });
    stub = answerFromTheTable();

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(stub.calls).toEqual([]);
  });

  it('stops quietly when the probe cannot reach the network', async () => {
    rememberSessionMarker();
    const queryClient = createIsolatedQueryClient();
    stub = stubFetch(() => Promise.reject(new TypeError('offline')));

    await expect(loadOfflineReadingWhenSignedIn(queryClient)).resolves.toBeUndefined();
    expect(listRequestedPaths(stub)).toEqual(['/api/instruments']);
  });

  it('reads the manifest it last held when the network is gone', async () => {
    rememberSessionMarker();
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(authKeys.session(), { authenticated: true });
    queryClient.setQueryData(offlineReadingKeys.manifest(), MANIFEST);
    stub = stubFetch(() => Promise.reject(new TypeError('offline')));

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(listRequestedPaths(stub)).toEqual([
      '/api/offline-manifest',
      '/api/sessions/session-next',
      '/api/setlists/by-session/session-next',
      '/api/songs',
      '/api/songs/song-held',
      '/api/songs/song-missing',
    ]);
  });

  it('stops quietly when the network is gone and no manifest was ever held', async () => {
    rememberSessionMarker();
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(authKeys.session(), { authenticated: true });
    stub = stubFetch(() => Promise.reject(new TypeError('offline')));

    await expect(loadOfflineReadingWhenSignedIn(queryClient)).resolves.toBeUndefined();
    expect(listRequestedPaths(stub)).toEqual(['/api/offline-manifest']);
  });
});
