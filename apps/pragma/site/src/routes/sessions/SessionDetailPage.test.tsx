import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { stubSheetDialog } from '../../components/molecules/sheet.test-utils';
import { SessionDetailPage } from './SessionDetailPage';

const CONCERT = {
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  kind: 'concert',
  date: '2026-11-01T19:00:00.000Z',
  venue: 'Le Petit Bain',
  capacity: null,
  gear: null,
  friendsCountPerMember: {},
  preparedConcertId: null,
};

const SESSION_SETLIST = {
  id: 'cccccccc-3333-4333-8333-333333333333',
  name: 'Main set',
  status: null,
  songCount: 0,
  sessionIds: [CONCERT.id],
};
const OTHER_SETLIST = {
  id: 'dddddddd-4444-4444-8444-444444444444',
  name: 'Encores',
  status: null,
  songCount: 2,
  sessionIds: [],
};

const sessionSetlists: { current: readonly (typeof SESSION_SETLIST)[] } = { current: [] };

function answerSessionApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === `/api/sessions/${CONCERT.id}`) return jsonResponse({ session: CONCERT });
  if (pathname === '/api/sessions') return jsonResponse({ sessions: [CONCERT] });
  if (pathname === '/api/members') return jsonResponse({ members: [] });
  if (pathname === '/api/setlists') {
    return jsonResponse({ setlists: [...sessionSetlists.current, OTHER_SETLIST] });
  }
  if (pathname === '/api/tasks') return jsonResponse({ tasks: [] });
  if (pathname === '/api/songs') return jsonResponse({ songs: [] });
  if (pathname.includes('setlists')) return jsonResponse({ setlists: sessionSetlists.current });
  return new Response(null, { status: 404 });
}

function renderSessionPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={[`/sessions/${CONCERT.id}`]}>
        <Routes>
          <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the concert page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    sessionSetlists.current = [];
    stubSheetDialog();
    stub = stubFetch((request) => Promise.resolve(answerSessionApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('reaches the audience vote through one link and carries no vote block itself', async () => {
    renderSessionPage();
    const audienceLink = await screen.findByRole('link', { name: 'Audience vote' });
    expect(audienceLink.getAttribute('href')).toBe(`/sessions/${CONCERT.id}/audience`);
    expect(audienceLink.dataset.variant).toBe('secondary');
    expect(screen.queryByRole('button', { name: /thirty-second round/ })).toBeNull();
    expect(screen.queryByText(/vote\//)).toBeNull();
  });

  it('offers Add a setlist as the primary action, and attaching one, when the session has none', async () => {
    renderSessionPage();
    expect(await screen.findByText(/No setlist on this session yet/)).toBeTruthy();
    const addSetlist = await screen.findByRole('button', { name: 'Add a setlist' });
    expect(addSetlist.dataset.variant).toBe('primary');
    fireEvent.click(screen.getByRole('button', { name: 'Attach an existing setlist' }));
    const chooser = await screen.findByRole('dialog', { name: 'Attach a setlist' });
    expect(await within(chooser).findByText('Encores')).toBeTruthy();
  });

  it('keeps a visible secondary Add a setlist once the session has one', async () => {
    sessionSetlists.current = [SESSION_SETLIST];
    renderSessionPage();
    const addSetlist = await screen.findByRole('button', { name: 'Add a setlist' });
    expect(addSetlist.dataset.variant).toBe('secondary');
    fireEvent.click(addSetlist);
    const chooser = await screen.findByRole('dialog', { name: 'Add a setlist' });
    expect(within(chooser).getByText('New setlist for this session')).toBeTruthy();
    expect(await within(chooser).findByText('Encores')).toBeTruthy();
    expect(within(chooser).queryByText('Main set')).toBeNull();
  });

  it('shows one part of the session at a time, chosen from tabs in its fixed header', async () => {
    renderSessionPage();
    const header = (
      await screen.findByRole('heading', { level: 1, name: 'Le Petit Bain' })
    ).closest('header');
    if (header === null) throw new Error('no page header');
    expect(header.classList.contains('sticky')).toBe(true);
    expect(within(header).getByRole('link', { name: 'Sessions' }).getAttribute('href')).toBe(
      '/sessions',
    );
    const tabs = within(header).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Setlist', 'Tasks', 'Takes', 'Details']);
    expect(screen.queryByRole('heading', { name: 'Who does what' })).toBeNull();

    fireEvent.click(within(header).getByRole('tab', { name: 'Tasks' }));
    expect(await screen.findByRole('heading', { name: 'Who does what' })).toBeTruthy();
    expect(screen.queryByText(/No setlist on this session yet/)).toBeNull();
  });

  it('opens the details when Edit is tapped', async () => {
    renderSessionPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('tab', { name: 'Details' }).getAttribute('aria-selected')).toBe('true');
  });
});

const PRACTICE = {
  id: 'eeeeeeee-5555-4555-8555-555555555555',
  kind: 'practice',
  date: '2099-01-10T18:00:00.000Z',
  venue: null,
  capacity: null,
  gear: null,
  friendsCountPerMember: null,
  preparedConcertId: null,
};
const OLD_CONCERT = {
  ...CONCERT,
  id: 'ffffffff-6666-4666-8666-666666666666',
  date: '2025-01-01T20:00:00.000Z',
};
const RECENT_CONCERT = {
  ...CONCERT,
  id: '99999999-7777-4777-8777-777777777777',
  date: '2026-06-01T20:00:00.000Z',
  venue: 'La Cigale',
};
const PRACTICE_SONGS = ['s1', 's2', 's3'].map((id) => ({
  id,
  title: `Song ${id}`,
  artist: 'Artist',
  status: 'rehearsed',
  deezerAlbumId: null,
  defaultLineup: {},
}));
const CONCERT_SETLISTS = [
  {
    id: 'set-old',
    name: 'Old',
    status: 'locked',
    songCount: 2,
    songIds: ['s1', 's2'],
    sessionIds: [OLD_CONCERT.id],
  },
  {
    id: 'set-recent',
    name: 'Recent',
    status: 'locked',
    songCount: 2,
    songIds: ['s2', 's3'],
    sessionIds: [RECENT_CONCERT.id],
  },
];
const NEW_PRACTICE_SETLIST_ID = '12345678-8888-4888-8888-888888888888';

interface RecordedWrite {
  readonly method: string;
  readonly pathname: string;
  readonly body: unknown;
}

function answerPracticeApi(writes: RecordedWrite[]) {
  return async (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (request.method !== 'GET') {
      const body: unknown = await request.json();
      writes.push({ method: request.method, pathname, body });
      if (pathname === '/api/setlists') {
        return jsonResponse({ setlist: { id: NEW_PRACTICE_SETLIST_ID, name: 'Practice' } }, 201);
      }
      return jsonResponse({ entries: [] }, 201);
    }
    if (pathname === `/api/sessions/${PRACTICE.id}`) return jsonResponse({ session: PRACTICE });
    if (pathname === '/api/sessions') {
      return jsonResponse({ sessions: [PRACTICE, OLD_CONCERT, RECENT_CONCERT] });
    }
    if (pathname === '/api/members') return jsonResponse({ members: [] });
    if (pathname === '/api/setlists') return jsonResponse({ setlists: CONCERT_SETLISTS });
    if (pathname === '/api/songs') return jsonResponse({ songs: PRACTICE_SONGS });
    if (pathname.includes('by-session')) return jsonResponse({ setlists: [] });
    return new Response(null, { status: 404 });
  };
}

function renderPracticePage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={[`/sessions/${PRACTICE.id}`]}>
        <Routes>
          <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('the practice page', () => {
  let stub: FetchStub | null = null;
  let writes: RecordedWrite[] = [];

  beforeEach(() => {
    writes = [];
    stubSheetDialog();
    stub = stubFetch(answerPracticeApi(writes));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('shows its songs instead of a setlist, with Choose songs as the primary action', async () => {
    renderPracticePage();
    expect(await screen.findByText('No songs chosen for this practice yet.')).toBeTruthy();
    const tabs = screen.getAllByRole('tab', { name: /Songs|Tasks|Takes|Details/ });
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Songs', 'Tasks', 'Takes', 'Details']);
    const choose = await screen.findByRole('button', { name: 'Choose songs' });
    expect(choose.dataset.variant).toBe('primary');
    expect(screen.queryByRole('link', { name: 'Open the setlist' })).toBeNull();
  });

  it('pools the songs of the picked concerts and saves the ticked ones as its songs', async () => {
    renderPracticePage();
    fireEvent.click(await screen.findByRole('button', { name: 'Choose songs' }));
    const concerts = screen.getByRole('dialog', { name: 'Concerts to prepare' });
    const rows = await within(concerts).findAllByRole('checkbox');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('La Cigale'),
      expect.stringContaining('Le Petit Bain'),
    ]);
    fireEvent.change(within(concerts).getByRole('searchbox'), { target: { value: 'cigale' } });
    fireEvent.click(within(concerts).getByRole('checkbox', { name: /La Cigale/ }));
    fireEvent.click(within(concerts).getByRole('button', { name: 'Next' }));

    const songs = screen.getByRole('dialog', { name: 'Songs to work on' });
    const songRows = within(songs).getAllByRole('checkbox');
    expect(songRows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Song s2'),
      expect.stringContaining('Song s3'),
    ]);
    fireEvent.click(within(songs).getByRole('checkbox', { name: /Song s3/ }));
    fireEvent.click(within(songs).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[0]).toMatchObject({
      method: 'POST',
      pathname: '/api/setlists',
      body: { sessionId: PRACTICE.id },
    });
    expect(writes[1]).toEqual({
      method: 'POST',
      pathname: `/api/setlists/${NEW_PRACTICE_SETLIST_ID}/entries/batch`,
      body: { songIds: ['s3'] },
    });
  });
});
