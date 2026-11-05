import type { MutationState } from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from '@tanstack/react-query-persist-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api.client';
import { authKeys, type SessionProbeResult } from './queries/auth.queries';
import { setlistKeys } from './queries/setlists.queries';
import { songKeys } from './queries/songs.queries';
import { queryCachePersistOptions, queryClient, startOfflineReading } from './query-client.setup';
import { hasSessionMarker, rememberSessionMarker } from './session-marker.adapter';

function answerWith(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))),
  );
}

const PERSISTED_CACHE_KEY = 'pragma.query-cache';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const PAUSED_WRITE: MutationState = {
  context: undefined,
  data: undefined,
  error: null,
  failureCount: 0,
  failureReason: null,
  isPaused: true,
  status: 'pending',
  variables: undefined,
  submittedAt: 0,
};

function sessionProbe(): SessionProbeResult | undefined {
  return queryClient.getQueryData<SessionProbeResult>(authKeys.session());
}

describe('a session the server stops accepting', () => {
  beforeEach(() => {
    localStorage.clear();
    rememberSessionMarker();
    queryClient.setQueryData<SessionProbeResult>(authKeys.session(), { authenticated: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    queryClient.clear();
  });

  it('ends in the tab as soon as any call is refused for it, so the gate sends the member to sign in', async () => {
    answerWith(401, { error: 'session-invalid', reason: 'bad-signature' });

    const response = await api.api.instruments.$get();

    expect(response.status).toBe(401);
    expect(hasSessionMarker()).toBe(false);
    expect(sessionProbe()).toStrictEqual({ authenticated: false });
  });

  it('drops the band data it held and the copy saved on the phone, so the next member to sign in reads none of it', async () => {
    queryClient.setQueryData(songKeys.list(), { songs: [{ id: 'song-1' }] });
    localStorage.setItem(PERSISTED_CACHE_KEY, '{"clientState":{}}');
    answerWith(401, { error: 'session-invalid', reason: 'bad-signature' });

    await api.api.instruments.$get();

    expect(queryClient.getQueryData(songKeys.list())).toBeUndefined();
    expect(localStorage.getItem(PERSISTED_CACHE_KEY)).toBeNull();
    expect(sessionProbe()).toStrictEqual({ authenticated: false });
  });

  it('stays open when a 401 refuses what was sent, such as a wrong current password', async () => {
    answerWith(401, { error: 'invalid-password' });

    await api.api.instruments.$get();

    expect(hasSessionMarker()).toBe(true);
    expect(sessionProbe()).toStrictEqual({ authenticated: true });
  });

  it('stays open on a 401 whose body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('Unauthorized', { status: 401 }))),
    );

    await api.api.instruments.$get();

    expect(hasSessionMarker()).toBe(true);
  });

  it('stays open on an answer that is not a 401', async () => {
    answerWith(500, { error: 'session-invalid' });

    await api.api.instruments.$get();

    expect(hasSessionMarker()).toBe(true);
  });
});

describe('the query cache saved on the phone', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('keeps a query for as long as the saved copy lives, so a restored query is not collected at once', () => {
    expect(queryCachePersistOptions.maxAge).toBe(SEVEN_DAYS_MS);
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(queryCachePersistOptions.maxAge);
  });

  it('saves the queries under its own key and never a write waiting for the network', async () => {
    queryClient.setQueryData(songKeys.list(), { songs: [{ id: 'song-1' }] });
    queryClient.getMutationCache().build(queryClient, { mutationKey: songKeys.all }, PAUSED_WRITE);

    await persistQueryClientSave({ queryClient, ...queryCachePersistOptions });
    queryClient.clear();
    await persistQueryClientRestore({ queryClient, ...queryCachePersistOptions });

    const saved: unknown = JSON.parse(localStorage.getItem(PERSISTED_CACHE_KEY) ?? 'null');
    expect(saved).toMatchObject({ buster: queryCachePersistOptions.buster });
    expect(queryClient.getQueryData(songKeys.list())).toStrictEqual({ songs: [{ id: 'song-1' }] });
    expect(queryClient.getMutationCache().getAll()).toEqual([]);
  });
});

describe('a member who signs in', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    queryClient.clear();
    localStorage.clear();
  });

  it('starts loading the offline reading at once, without waiting for the next start of the app', async () => {
    rememberSessionMarker();
    answerWith(200, { songs: [], sessions: [] });

    queryClient.setQueryData<SessionProbeResult>(authKeys.session(), { authenticated: true });

    await vi.waitFor(() => {
      expect(
        vi
          .mocked(fetch)
          .mock.calls.map(([request, init]) =>
            [
              request instanceof Request ? request.url : JSON.stringify(request),
              typeof init?.body === 'string' ? init.body : '',
            ].join(' '),
          ),
      ).toContainEqual(expect.stringContaining('/api/sessions'));
    });
  });

  it('loads nothing on a restore that holds no probe answer, and never probes for one', async () => {
    rememberSessionMarker();
    answerWith(200, { songs: [], sessions: [] });

    startOfflineReading();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('loads nothing when the probe says the session is gone', async () => {
    rememberSessionMarker();
    answerWith(200, {});

    queryClient.setQueryData<SessionProbeResult>(authKeys.session(), { authenticated: false });
    await Promise.resolve();

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('how long a read stays fresh', () => {
  it('keeps band data five minutes, so returning to the app refetches nothing', () => {
    expect(queryClient.defaultQueryOptions({ queryKey: songKeys.list() }).staleTime).toBe(300_000);
  });

  it('keeps a setlist five minutes too, because a change another member makes now arrives as an invalidation', () => {
    expect(
      queryClient.defaultQueryOptions({ queryKey: setlistKeys.entriesOf('setlist-1') }).staleTime,
    ).toBe(300_000);
  });
});
