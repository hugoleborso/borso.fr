import { useQuery, type QueryClient } from '@tanstack/react-query';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { READ_BATCH_PATH } from '@domain/read-batch.core';
import '../../i18n/i18n.setup';
import { api } from '../../lib/api.client';
import {
  createIsolatedQueryClient,
  deferred,
  type FetchStub,
  flushMicrotasks,
  flushTasks,
  jsonResponse,
  type MountedTree,
  mountWithClient,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { authKeys } from '../../lib/queries/auth.queries';
import { rememberSessionMarker } from '../../lib/session-marker.adapter';
import { RequireSession } from './RequireSession';
import { AUTH_QUERY_ROOT, isBandDataQuery } from './session-gate.core';

const SONGS_KEY = ['songs', 'list'] as const;
const LOADING_EN = 'Tuning up…';
const FAILED_EN = "pragma could not reach the band's data.";
const RETRY_EN = 'Try again';
const UNAUTHORISED = 401;
const REFUSED = 403;

async function countSongs(): Promise<number> {
  const response = await api.api.songs.$get();
  if (!response.ok) throw new Error(`songs ${String(response.status)}`);
  const songs: unknown = await response.json();
  return Array.isArray(songs) ? songs.length : 0;
}

function SongsScreen(): JSX.Element {
  const songs = useQuery({ queryKey: SONGS_KEY, queryFn: countSongs });
  return <p data-testid="songs">{`songs: ${String(songs.data ?? 'none')}`}</p>;
}

function GatedApp(): JSX.Element {
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<p>sign in</p>} />
        <Route element={<RequireSession />}>
          <Route path="/" element={<SongsScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function readStatus(): string | null {
  return document.querySelector('[role=status]')?.textContent ?? null;
}

function readSongsWrapper(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-testid=songs]')?.parentElement ?? null;
}

function readOverlay(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-opening-phase]');
}

const JSDOM_ANIMATION_EVENT_TYPES = {
  start: 'webkitAnimationStart',
  end: 'webkitAnimationEnd',
} as const;

function fireAnimation(moment: 'start' | 'end', animationName: string): void {
  const leftNote = document.querySelector('[data-mark-part=left-note]');
  if (leftNote === null) throw new Error('no left note');
  const event = new Event(JSDOM_ANIMATION_EVENT_TYPES[moment], { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: animationName });
  act(() => {
    leftNote.dispatchEvent(event);
  });
}

function recordRawRequests(): string[] {
  const stubbed = globalThis.fetch;
  const raw: string[] = [];
  globalThis.fetch = async (input, init) => {
    const address = input instanceof Request ? input.url : input.toString();
    const request = new Request(new URL(address, 'http://localhost.test'), init);
    raw.push(`${request.method} ${new URL(request.url).pathname}`);
    return await stubbed(input, init);
  };
  return raw;
}

// @FollowsBlueprint test-component-render
describe('RequireSession', () => {
  let queryClient: QueryClient;
  let fetchStub: FetchStub | null = null;
  let tree: MountedTree | null = null;

  beforeEach(() => {
    localStorage.clear();
    queryClient = createIsolatedQueryClient();
  });

  afterEach(() => {
    tree?.unmount();
    tree = null;
    fetchStub?.restore();
    fetchStub = null;
    queryClient.clear();
    localStorage.clear();
  });

  it('reads the session probe under the root the gate leaves out of band data', () => {
    expect(authKeys.all).toEqual([AUTH_QUERY_ROOT]);
    expect(isBandDataQuery(authKeys.session())).toBe(false);
  });

  it('sends a visitor with no marker to sign in without a request', async () => {
    fetchStub = stubFetch(() => Promise.resolve(jsonResponse([])));
    tree = mountWithClient(queryClient, <GatedApp />);
    await flushTasks();
    expect(document.body.textContent).toContain('sign in');
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('mounts the route inert beneath the opening screen, so the probe and its read leave in one batch', async () => {
    rememberSessionMarker();
    const songs = deferred<Response>();
    fetchStub = stubFetch((request) =>
      new URL(request.url).pathname === '/api/songs'
        ? songs.promise
        : Promise.resolve(jsonResponse([])),
    );
    const raw = recordRawRequests();
    tree = mountWithClient(queryClient, <GatedApp />);
    await flushTasks();
    expect(readStatus()).toBe(LOADING_EN);
    expect(document.querySelector('[data-testid=songs]')?.textContent).toBe('songs: none');
    expect(readSongsWrapper()?.hasAttribute('inert')).toBe(true);
    expect(raw).toEqual([`POST ${READ_BATCH_PATH}`]);
    expect(fetchStub.calls.map((call) => new URL(call.url).pathname).toSorted()).toEqual([
      '/api/instruments',
      '/api/songs',
    ]);
    songs.resolve(jsonResponse(['Creep']));
    await flushTasks();
    await flushMicrotasks();
    expect(readStatus()).toBeNull();
    expect(readSongsWrapper()?.hasAttribute('inert')).toBe(false);
    expect(document.querySelector('[data-testid=songs]')?.textContent).toBe('songs: 1');
  });

  it('plays the exit once the mark was seen moving, then leaves for good', async () => {
    rememberSessionMarker();
    const songs = deferred<Response>();
    fetchStub = stubFetch((request) =>
      new URL(request.url).pathname === '/api/songs'
        ? songs.promise
        : Promise.resolve(jsonResponse([])),
    );
    tree = mountWithClient(queryClient, <GatedApp />);
    await flushTasks();
    fireAnimation('start', 'downbeat-enter-left');
    songs.resolve(jsonResponse(['Creep']));
    await flushTasks();
    await flushMicrotasks();
    expect(readOverlay()?.dataset.openingPhase).toBe('leaving');
    expect(readSongsWrapper()?.hasAttribute('inert')).toBe(false);
    fireAnimation('end', 'downbeat-enter-left');
    expect(readOverlay()?.dataset.openingPhase).toBe('leaving');
    fireAnimation('end', 'downbeat-exit');
    expect(readOverlay()).toBeNull();
  });

  it('renders a cached screen at once, with no opening screen', async () => {
    rememberSessionMarker();
    queryClient.setQueryData(SONGS_KEY, 2);
    fetchStub = stubFetch(() => Promise.resolve(jsonResponse([])));
    tree = mountWithClient(queryClient, <GatedApp />);
    expect(readOverlay()).toBeNull();
    expect(document.querySelector('[data-testid=songs]')?.textContent).toBe('songs: 2');
    await flushTasks();
  });

  it('sends the member to sign in when the probe answers 401', async () => {
    rememberSessionMarker();
    fetchStub = stubFetch(() => Promise.resolve(jsonResponse({}, UNAUTHORISED)));
    tree = mountWithClient(queryClient, <GatedApp />);
    await flushTasks();
    await flushMicrotasks();
    expect(document.body.textContent).toContain('sign in');
  });

  it('shows the failure when the first batch fails, and retries every read in one batch', async () => {
    rememberSessionMarker();
    let isApiUp = false;
    fetchStub = stubFetch(() =>
      Promise.resolve(isApiUp ? jsonResponse(['Creep']) : jsonResponse({}, REFUSED)),
    );
    const raw = recordRawRequests();
    tree = mountWithClient(queryClient, <GatedApp />);
    await flushTasks();
    await flushMicrotasks();
    expect(readStatus()).toBe(FAILED_EN);
    expect(document.body.textContent).not.toContain('sign in');
    isApiUp = true;
    raw.length = 0;
    const retry = [...document.querySelectorAll('button')].find(
      (button) => button.textContent === RETRY_EN,
    );
    act(() => {
      retry?.click();
    });
    await flushTasks();
    await flushMicrotasks();
    expect(raw).toEqual([`POST ${READ_BATCH_PATH}`]);
    expect(document.querySelector('[data-testid=songs]')?.textContent).toBe('songs: 1');
    expect(readStatus()).toBeNull();
  });
});
