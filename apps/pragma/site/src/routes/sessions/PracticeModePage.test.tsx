import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from '../../components/molecules/sheet.test-utils';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { recordProductEvent } from '../../observability/product-event.adapter';
import { PracticeModePage } from './PracticeModePage';

vi.mock('../../observability/product-event.adapter', () => ({
  recordProductEvent: vi.fn(),
}));
import { serializePracticePosition } from './practice-mode.core';

class StillResizeObserver implements ResizeObserver {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

const SESSION = {
  id: 'session-today',
  kind: 'practice',
  date: new Date().toISOString(),
  preparedConcertId: null,
  venue: null,
  capacity: null,
  gear: null,
  friendsCountPerMember: null,
};
const SETLIST = {
  id: 'setlist-1',
  name: 'Wednesday',
  status: 'locked',
  songCount: 2,
  sessionIds: [],
};
const SONGS = [
  { id: 'song-a', title: 'Superstition', artist: 'Stevie Wonder', defaultLineup: {} },
  { id: 'song-b', title: 'Valerie', artist: 'Amy Winehouse', defaultLineup: {} },
];
function entry(id: string, songId: string, position: number) {
  return {
    id,
    songId,
    position,
    lineupOverride: null,
    keyOverride: null,
    capo: null,
    notes: '',
    energy: null,
  };
}
const ENTRIES = [entry('entry-a', 'song-a', 0), entry('entry-b', 'song-b', 1)];
const REORDERED_ENTRIES = [entry('entry-b', 'song-b', 0), entry('entry-a', 'song-a', 1)];
const FIRST_HALF = { ...SETLIST, id: 'setlist-first', name: 'First half', songCount: 1 };
const ENCORE = { ...SETLIST, id: 'setlist-encore', name: 'Encore', songCount: 1 };
const ENTRIES_BY_SETLIST: Readonly<Record<string, unknown[]>> = {
  [FIRST_HALF.id]: [entry('entry-a', 'song-a', 0)],
  [ENCORE.id]: [entry('entry-b', 'song-b', 0)],
};
const answered: { setlists: readonly unknown[]; entries: readonly unknown[] } = {
  setlists: [SETLIST],
  entries: ENTRIES,
};
const PRACTICE_STORAGE_KEY = `pragma.practice.${SESSION.id}`;

function answerPracticeApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === `/api/sessions/${SESSION.id}`) return jsonResponse({ session: SESSION });
  if (pathname === '/api/sessions') return jsonResponse({ sessions: [SESSION] });
  if (pathname === `/api/setlists/by-session/${SESSION.id}`) {
    return jsonResponse({ setlists: answered.setlists });
  }
  if (pathname === `/api/setlists/${SETLIST.id}/entries`) {
    return jsonResponse({ entries: answered.entries });
  }
  const setlistEntries = /^\/api\/setlists\/([^/]+)\/entries$/.exec(pathname);
  if (setlistEntries !== null) {
    return jsonResponse({ entries: ENTRIES_BY_SETLIST[setlistEntries[1] ?? ''] ?? [] });
  }
  if (pathname === '/api/songs') return jsonResponse({ songs: SONGS });
  if (pathname === '/api/members') return jsonResponse({ members: [] });
  if (pathname === '/api/instruments') return jsonResponse({ instruments: [] });
  if (pathname === '/api/transition-comments') return jsonResponse({ comments: [] });
  if (pathname === '/api/takes') return jsonResponse({ takes: [] });
  return new Response(null, { status: 404 });
}

function renderPracticeMode(queryClient = createIsolatedQueryClient()): void {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/sessions/${SESSION.id}/practice`]}>
        <Routes>
          <Route path="/sessions/:sessionId/practice" element={<PracticeModePage />} />
          <Route path="/sessions/:sessionId" element={<p>Session page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('practice mode', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StillResizeObserver);
    stubSheetDialog();
    localStorage.clear();
    answered.setlists = [SETLIST];
    answered.entries = ENTRIES;
    stub = stubFetch((request) => Promise.resolve(answerPracticeApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('starts on the first song, and Next song moves on without writing to the server', async () => {
    renderPracticeMode();
    expect(await screen.findByRole('heading', { name: 'Superstition' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Song 1 of 2' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Chords' }).getAttribute('href')).toContain('/scene');
    expect(screen.getByRole('button', { name: 'Note' }).hasAttribute('aria-pressed')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Next song' }));

    expect(await screen.findByRole('heading', { name: 'Valerie' })).toBeTruthy();
    expect(stub?.calls.every((request) => request.method === 'GET')).toBe(true);
  });

  it('resumes on the song it was on after a reload the same day', async () => {
    const stored = serializePracticePosition(
      [
        { entryId: 'entry-a', songId: 'song-a', setlistId: SETLIST.id, setlistName: SETLIST.name },
        { entryId: 'entry-b', songId: 'song-b', setlistId: SETLIST.id, setlistName: SETLIST.name },
      ],
      1,
      new Date(),
    );
    localStorage.setItem(PRACTICE_STORAGE_KEY, stored ?? '');
    renderPracticeMode();
    expect(await screen.findByRole('heading', { name: 'Valerie' })).toBeTruthy();
  });

  it('offers End the practice on the last song, which returns to the session page', async () => {
    renderPracticeMode();
    fireEvent.click(await screen.findByRole('button', { name: 'Next song' }));
    await screen.findByRole('heading', { name: 'Valerie' });
    const [menuItem, stripPill] = screen.getAllByRole('button', { name: 'End the practice' });
    expect(menuItem).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next song' })).toBeNull();
    if (stripPill !== undefined) fireEvent.click(stripPill);
    expect(await screen.findByText('Session page')).toBeTruthy();
    expect(localStorage.getItem(PRACTICE_STORAGE_KEY)).toBeNull();
    expect(recordProductEvent).toHaveBeenCalledExactlyOnceWith('practice_mode_ended', {
      songs_moved_through: 2,
    });
  });

  it('keeps the song shown on arrival current when the setlist is reordered elsewhere', async () => {
    const queryClient = createIsolatedQueryClient();
    renderPracticeMode(queryClient);
    expect(await screen.findByRole('heading', { name: 'Superstition' })).toBeTruthy();
    answered.entries = REORDERED_ENTRIES;
    await act(async () => {
      await queryClient.refetchQueries();
    });
    expect(await screen.findByRole('button', { name: 'Song 2 of 2' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Superstition' })).toBeTruthy();
  });

  it('names the setlist of the current song when the practice plays several', async () => {
    answered.setlists = [FIRST_HALF, ENCORE];
    renderPracticeMode();
    expect(await screen.findByRole('button', { name: 'Song 1 of 2 · First half' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next song' }));
    expect(await screen.findByRole('button', { name: 'Song 2 of 2 · Encore' })).toBeTruthy();
  });
});
