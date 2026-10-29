import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
import { SongDetailPage } from './SongDetailPage';

class StillResizeObserver implements ResizeObserver {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

const SONG = {
  id: 'song-1',
  title: 'Get Lucky',
  artist: 'Daft Punk',
  status: 'rehearsed',
  origin: 'cover',
  album: null,
  durationSeconds: null,
  deezerAlbumId: null,
  deezerTrackId: '67238735',
  spotifyTrackId: null,
  tonalityStart: 'F#m',
  tonalityEnd: null,
  baseEnergy: null,
  tags: [],
  isrcs: [],
  chart: { kind: 'chordpro', text: '[F#m]Like the legend' },
  links: [{ url: 'https://www.youtube.com/watch?v=5NV6Rdv1a3I', provider: 'youtube', comment: '' }],
  defaultLineup: { 'member-1': ['bass'] },
  structureNotes: '',
  gimmickNotes: '',
  notes: 'Count in four.',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};
const SETLISTS = [
  {
    id: 'setlist-1',
    name: 'Concert',
    status: 'locked',
    songCount: 1,
    songIds: ['song-1'],
    sessionIds: [],
  },
  {
    id: 'setlist-2',
    name: 'Practice',
    status: 'locked',
    songCount: 1,
    songIds: ['song-2'],
    sessionIds: [],
  },
];
const OVERVIEW = {
  today: '2026-10-28',
  queue: [],
  readiness: null,
};

function answerSongApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === `/api/songs/${SONG.id}`) return jsonResponse({ song: SONG });
  if (pathname === '/api/setlists') return jsonResponse({ setlists: SETLISTS });
  if (pathname === '/api/me') return jsonResponse({ memberId: 'member-1', firstName: 'Hugo' });
  if (pathname === '/api/studies/overview') return jsonResponse(OVERVIEW);
  if (pathname === '/api/studies' && request.method === 'POST') {
    return jsonResponse({ study: {} }, 201);
  }
  if (pathname === '/api/members') {
    return jsonResponse({ members: [{ id: 'member-1', firstName: 'Hugo', color: '#d4806a' }] });
  }
  if (pathname === '/api/instruments') {
    return jsonResponse({ instruments: [{ id: 'bass', name: 'Bass' }] });
  }
  if (pathname === '/api/mastery/defaults') return jsonResponse({ defaults: [] });
  if (pathname.startsWith('/api/mastery/')) return jsonResponse({ overrides: [], history: [] });
  if (pathname === '/api/takes') return jsonResponse({ takes: [] });
  if (pathname === '/api/sessions') return jsonResponse({ sessions: [] });
  return new Response(null, { status: 404 });
}

function renderSongPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={[`/catalog/${SONG.id}`]}>
        <Routes>
          <Route path="/catalog/:songId" element={<SongDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('song page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StillResizeObserver);
    stubSheetDialog();
    stub = stubFetch((request) => Promise.resolve(answerSongApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
    vi.unstubAllGlobals();
  });

  it('offers one way into stage mode, and no button inside a link', async () => {
    renderSongPage();
    await screen.findByRole('heading', { name: 'Get Lucky' });

    const stageLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.endsWith('/scene'));
    expect(stageLinks.map((link) => link.textContent)).toEqual(['Full screen']);
    expect(document.querySelectorAll('a button')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe(
      `/catalog/${SONG.id}/edit`,
    );
  });

  it('keeps the title and the Edit button apart in a fixed header with a back link', async () => {
    renderSongPage();
    const title = await screen.findByRole('heading', { level: 1, name: 'Get Lucky' });
    const header = title.closest('header');
    if (header === null) throw new Error('no page header');
    expect(header.classList.contains('sticky')).toBe(true);
    expect(within(header).getByRole('link', { name: 'Songs' }).getAttribute('href')).toBe(
      '/catalog',
    );
    const edit = within(header).getByRole('link', { name: 'Edit' });
    expect(title.contains(edit)).toBe(false);
    expect(title.classList.contains('wrap-anywhere')).toBe(true);
    expect(title.classList.contains('line-clamp-3')).toBe(true);
    expect(edit.parentElement?.classList.contains('shrink-0')).toBe(true);
  });

  it('shows one listen link per link the song has, Spotify always among them, and names its setlists', async () => {
    renderSongPage();
    const listen = await screen.findByRole('list', { name: 'Listen' });

    expect(
      within(listen)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Deezer', 'Spotify', 'YouTube']);
    expect(await screen.findByText('In Concert')).toBeTruthy();
  });

  it('logs a study for each instrument the member holds when Practised is tapped', async () => {
    renderSongPage();
    const practised = await screen.findByRole('button', { name: 'Practised' });
    await waitFor(() => {
      expect(practised).toHaveProperty('disabled', false);
    });

    fireEvent.click(practised);

    await waitFor(() => {
      expect(practised.getAttribute('aria-pressed')).toBe('true');
    });
    const studyWrites = stub?.calls.filter((request) => request.method === 'POST') ?? [];
    expect(studyWrites).toHaveLength(1);
    expect(await studyWrites[0]?.json()).toEqual({ songId: SONG.id, instrumentId: 'bass' });
  });

  it('opens the song notes in a sheet when Notes is tapped', async () => {
    renderSongPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Notes' }));
    const sheet = await screen.findByRole('dialog', { name: 'Notes' });
    expect(within(sheet).getByText('Count in four.')).toBeTruthy();
  });
});
