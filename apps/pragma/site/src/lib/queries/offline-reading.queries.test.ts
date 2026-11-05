import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSessionMarker, rememberSessionMarker } from '../session-marker.adapter';
import { authKeys } from './auth.queries';
import { loadOfflineReadingWhenSignedIn } from './offline-reading.queries';
import { createIsolatedQueryClient, jsonResponse, stubFetch } from './queries.test-utils';
import { sessionKeys } from './sessions.queries';
import { setlistKeys } from './setlists.queries';
import { songKeys } from './songs.queries';

const NEXT_SESSION = { id: 'session-next', date: '2099-06-01T18:00:00.000Z' };
const LATER_SESSION = { id: 'session-later', date: '2099-07-01T18:00:00.000Z' };

const ANSWERS: Readonly<Record<string, unknown>> = {
  '/api/songs': { songs: [] },
  '/api/sessions': { sessions: [LATER_SESSION, NEXT_SESSION] },
  '/api/sessions/session-next': { session: NEXT_SESSION },
  '/api/setlists/by-session/session-next': { setlists: [{ id: 'setlist-next' }] },
  '/api/setlists/setlist-next': { setlist: { id: 'setlist-next', name: 'Next' } },
  '/api/setlists/setlist-next/entries': { entries: [] },
};

const NOT_FOUND_STATUS = 404;

function answerFrom(answers: Readonly<Record<string, unknown>>): ReturnType<typeof stubFetch> {
  return stubFetch((request) => {
    const body = answers[new URL(request.url).pathname];
    return Promise.resolve(
      body === undefined ? jsonResponse({}, NOT_FOUND_STATUS) : jsonResponse(body),
    );
  });
}

function listRequestedPaths(stub: ReturnType<typeof stubFetch>): string[] {
  return stub.calls.map((request) => new URL(request.url).pathname).toSorted();
}

function createSignedInQueryClient() {
  rememberSessionMarker();
  const queryClient = createIsolatedQueryClient();
  queryClient.setQueryData(authKeys.session(), { authenticated: true });
  return queryClient;
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
    vi.useRealTimers();
  });

  it('reads the two lists, then the next session, its setlists, each setlist and its entries', async () => {
    const queryClient = createSignedInQueryClient();
    stub = answerFrom(ANSWERS);

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(listRequestedPaths(stub)).toEqual([
      '/api/sessions',
      '/api/sessions/session-next',
      '/api/setlists/by-session/session-next',
      '/api/setlists/setlist-next',
      '/api/setlists/setlist-next/entries',
      '/api/songs',
    ]);
    expect(queryClient.getQueryData(setlistKeys.detail('setlist-next'))).toEqual({
      setlist: { id: 'setlist-next', name: 'Next' },
    });
    expect(queryClient.getQueryData(setlistKeys.entriesOf('setlist-next'))).toEqual({
      entries: [],
    });
  });

  it('takes each song from the catalogue list and leaves a song it already holds alone', async () => {
    const queryClient = createSignedInQueryClient();
    queryClient.setQueryData(songKeys.byId('song-held'), { song: { id: 'song-held', title: 'A' } });
    stub = answerFrom({
      ...ANSWERS,
      '/api/songs': { songs: [{ id: 'song-held', title: 'B' }, { id: 'song-listed' }] },
    });

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(listRequestedPaths(stub)).not.toContainEqual(expect.stringMatching(/^\/api\/songs\//));
    expect(queryClient.getQueryData(songKeys.byId('song-listed'))).toEqual({
      song: { id: 'song-listed' },
    });
    expect(queryClient.getQueryData(songKeys.byId('song-held'))).toEqual({
      song: { id: 'song-held', title: 'A' },
    });
  });

  it('preloads a session that started earlier today, as home shows it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T20:00:00.000Z'));
    const startedToday = { id: 'session-next', date: '2026-11-05T17:00:00.000Z' };
    const queryClient = createSignedInQueryClient();
    stub = answerFrom({ ...ANSWERS, '/api/sessions': { sessions: [LATER_SESSION, startedToday] } });

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(listRequestedPaths(stub)).toContain('/api/sessions/session-next');
    expect(listRequestedPaths(stub)).not.toContain('/api/sessions/session-later');
  });

  it('stops after the two lists when no session lies ahead', async () => {
    const queryClient = createSignedInQueryClient();
    stub = answerFrom({ ...ANSWERS, '/api/sessions': { sessions: [] } });

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(listRequestedPaths(stub)).toEqual(['/api/sessions', '/api/songs']);
  });

  it('never probes the session itself, so a start with no probe answer sends nothing', async () => {
    rememberSessionMarker();
    const queryClient = createIsolatedQueryClient();
    stub = answerFrom(ANSWERS);

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(stub.calls).toEqual([]);
  });

  it('sends nothing on a browser that never signed in', async () => {
    forgetSessionMarker();
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(authKeys.session(), { authenticated: true });
    stub = answerFrom(ANSWERS);

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(stub.calls).toEqual([]);
  });

  it('sends nothing once the session has ended', async () => {
    rememberSessionMarker();
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(authKeys.session(), { authenticated: false });
    stub = answerFrom(ANSWERS);

    await loadOfflineReadingWhenSignedIn(queryClient);

    expect(stub.calls).toEqual([]);
  });

  it('picks the next session from the list it last held when the network is gone', async () => {
    const queryClient = createSignedInQueryClient();
    queryClient.setQueryData(sessionKeys.list(), { sessions: [NEXT_SESSION] });
    stub = stubFetch(() => Promise.reject(new TypeError('offline')));

    await expect(loadOfflineReadingWhenSignedIn(queryClient)).resolves.toBeUndefined();

    expect(listRequestedPaths(stub)).toEqual([
      '/api/sessions',
      '/api/sessions/session-next',
      '/api/setlists/by-session/session-next',
      '/api/songs',
    ]);
  });

  it('stops quietly when the network is gone and no list was ever held', async () => {
    const queryClient = createSignedInQueryClient();
    stub = stubFetch(() => Promise.reject(new TypeError('offline')));

    await expect(loadOfflineReadingWhenSignedIn(queryClient)).resolves.toBeUndefined();

    expect(listRequestedPaths(stub)).toEqual(['/api/sessions', '/api/songs']);
  });
});
