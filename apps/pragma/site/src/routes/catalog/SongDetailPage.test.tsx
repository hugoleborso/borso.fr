import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { recordProductEvent } from '../../observability/product-event.adapter';
import { SongDetailPage } from './SongDetailPage';

vi.mock('../../observability/product-event.adapter', () => ({
  recordProductEvent: vi.fn(),
}));

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
  charts: [
    { kind: 'chordpro', text: '[F#m]Like the legend', instrumentIds: [], label: null },
    { kind: 'chordpro', text: '[A]Groove line', instrumentIds: ['bass'], label: 'Groove' },
  ],
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

const LINKING_COMPOSITION = {
  id: 'composition-1',
  title: 'Get Lucky',
  songId: SONG.id,
  createdAt: '2026-10-01T00:00:00.000Z',
};
const OTHER_COMPOSITION = {
  id: 'composition-2',
  title: 'Composition 2',
  songId: null,
  createdAt: '2026-10-02T00:00:00.000Z',
};

const PREVIEW_URL = 'https://cdnt-preview.dzcdn.net/api/1/1/c/8/a/0/c8a6.mp3?hdnea=exp=1';

function answerSongApi(
  request: Request,
  compositions: readonly unknown[] = [OTHER_COMPOSITION],
): Response {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/compositions') return jsonResponse({ compositions });
  if (pathname === `/api/songs/${SONG.id}`) return jsonResponse({ song: SONG });
  if (pathname === `/api/songs/${SONG.id}/preview`)
    return jsonResponse({ previewUrl: PREVIEW_URL });
  if (pathname === '/api/setlists') return jsonResponse({ setlists: SETLISTS });
  if (pathname === '/api/me') return jsonResponse({ memberId: 'member-1', firstName: 'Hugo' });
  if (pathname === '/api/studies/overview') return jsonResponse(OVERVIEW);
  if (pathname === '/api/members') {
    return jsonResponse({ members: [{ id: 'member-1', firstName: 'Hugo', color: '#d4806a' }] });
  }
  if (pathname === '/api/instruments') {
    return jsonResponse({ instruments: [{ id: 'bass', name: 'Bass', icon: 'bass', position: 1 }] });
  }
  if (pathname === '/api/mastery/defaults') return jsonResponse({ defaults: [] });
  if (pathname.startsWith('/api/mastery/')) return jsonResponse({ overrides: [], history: [] });
  if (pathname === '/api/takes') return jsonResponse({ takes: [] });
  if (pathname === '/api/sessions') return jsonResponse({ sessions: [] });
  return new Response(null, { status: 404 });
}

function renderSongPage(search = ''): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={[`/catalog/${SONG.id}${search}`]}>
        <Routes>
          <Route path="/catalog/:songId" element={<SongDetailPage />} />
          <Route path="/catalog/:songId/edit" element={<p>Song edit form</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('song page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stub = stubFetch((request) => Promise.resolve(answerSongApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
    vi.unstubAllGlobals();
  });

  it('offers one way into stage mode, from the Chords tab, and no button inside a link', async () => {
    renderSongPage('?tab=chords');
    await screen.findByRole('heading', { name: 'Get Lucky' });

    const stageLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.endsWith('/scene'));
    expect(stageLinks.map((link) => link.textContent)).toEqual(['Full screen']);
    expect(document.querySelectorAll('a button')).toHaveLength(0);
  });

  it('counts two transpose taps that land before a render as two steps', async () => {
    renderSongPage('?tab=chords');
    const transpose = await screen.findByRole('group', { name: 'Transpose' });
    const transposeUp = within(transpose).getByRole('button', { name: 'Transpose up' });
    act(() => {
      transposeUp.click();
      transposeUp.click();
    });
    expect(within(screen.getByRole('group', { name: 'Transpose' })).getByText('+2')).toBeTruthy();
  });

  it('opens on the chart of the instrument the member holds, and keeps the transpose across pills', async () => {
    renderSongPage('?tab=chords');
    const bassPill = await screen.findByRole('tab', { name: 'Bass' });
    await waitFor(() => expect(bassPill.getAttribute('aria-selected')).toBe('true'));
    expect(document.body.textContent).toContain('Groove line');

    const transpose = screen.getByRole('group', { name: 'Transpose' });
    fireEvent.click(within(transpose).getByRole('button', { name: 'Transpose up' }));
    const chartSwitcher = screen.getByRole('tablist', { name: 'Charts of this song' });
    fireEvent.pointerDown(within(chartSwitcher).getByRole('tab', { name: 'Chords' }));
    fireEvent.click(within(chartSwitcher).getByRole('tab', { name: 'Chords' }));

    await waitFor(() => expect(document.body.textContent).toContain('Like the legend'));
    expect(within(screen.getByRole('group', { name: 'Transpose' })).getByText('+1')).toBeTruthy();
    expect(recordProductEvent).toHaveBeenCalledWith('chord_chart_switched', {
      surface: 'song',
      fromOpening: true,
    });
  });

  it('keeps the title in a fixed header with a back link, and Edit one tap away', async () => {
    renderSongPage();
    const title = await screen.findByRole('heading', { level: 1, name: 'Get Lucky' });
    const header = title.closest('header');
    if (header === null) throw new Error('no page header');
    expect(header.classList.contains('fixed')).toBe(true);
    expect(within(header).getByRole('link', { name: 'Songs' }).getAttribute('href')).toBe(
      '/catalog',
    );
    expect(within(header).queryByText('F#m')).toBeNull();
    expect(title.classList.contains('wrap-anywhere')).toBe(true);
    expect(title.classList.contains('line-clamp-3')).toBe(true);

    fireEvent.click(within(header).getByRole('link', { name: 'Edit' }));
    expect(await screen.findByText('Song edit form')).toBeTruthy();
  });

  it('plays the Deezer excerpt from the button over the cover', async () => {
    renderSongPage();
    const play = await screen.findByRole('button', { name: 'Play a 30-second excerpt' });
    const header = play.closest('header');
    expect(header).not.toBeNull();
    expect(document.querySelector('audio')?.getAttribute('src')).toBe(PREVIEW_URL);
    expect(
      stub?.calls.some((call) => new URL(call.url).pathname === `/api/songs/${SONG.id}/preview`),
    ).toBe(true);
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

  it('offers no Practised toggle, because opening the app is what lights the flame', async () => {
    renderSongPage();
    await screen.findByRole('heading', { name: 'Get Lucky' });
    expect(screen.queryByRole('button', { name: 'Practised' })).toBeNull();
  });

  it('shows the comments inline, then the lineup as chips with no mastery', async () => {
    renderSongPage();
    expect(await screen.findByText('Count in four.')).toBeTruthy();
    const lineup = await screen.findByRole('region', { name: 'Default lineup' });
    expect(within(lineup).getByRole('img', { name: 'Bass' })).toBeTruthy();
    expect(within(lineup).getByRole('img', { name: 'Hugo' })).toBeTruthy();
    expect(screen.queryByText('My part')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Comments' })).toBeNull();

    fireEvent.click(within(lineup).getByRole('button', { name: 'Edit' }));
    expect(await screen.findByRole('dialog', { name: 'Default lineup' })).toBeTruthy();
  });

  it('saves the base energy the member sets on the Info tab', async () => {
    renderSongPage();
    const meter = await screen.findByRole('slider', { name: 'Base energy' });
    expect(meter.getAttribute('aria-valuetext')).toBe('Not set, showing 5');

    fireEvent.keyDown(meter, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(stub?.calls.some((request) => request.method === 'PUT')).toBe(true);
    });
    const songWrite = stub?.calls.find((request) => request.method === 'PUT');
    expect(new URL(songWrite?.url ?? '').pathname).toBe(`/api/songs/${SONG.id}`);
    expect(await songWrite?.json()).toEqual({ baseEnergy: 6 });
  });

  it('links back to the sketch of the composition the song was catalogued from', async () => {
    stub?.restore();
    stub = stubFetch((request) =>
      Promise.resolve(answerSongApi(request, [OTHER_COMPOSITION, LINKING_COMPOSITION])),
    );
    renderSongPage();

    const sketchLink = await screen.findByRole('link', { name: 'Open the sketch' });
    expect(sketchLink.getAttribute('href')).toBe(`/compos/${LINKING_COMPOSITION.id}/sketch`);
  });

  it('offers no sketch link when no composition links the song', async () => {
    renderSongPage();
    await screen.findByRole('heading', { name: 'Get Lucky' });
    await waitFor(() =>
      expect(stub?.calls.some((call) => call.url.endsWith('/api/compositions'))).toBe(true),
    );

    expect(screen.queryByRole('link', { name: 'Open the sketch' })).toBeNull();
  });

  it('opens on the Info tab and moves between Info, Chords and Takes', async () => {
    renderSongPage();
    await screen.findByRole('heading', { name: 'Get Lucky' });
    await screen.findByRole('tab', { name: 'Takes (0)' });
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Info',
      'Chords',
      'Takes (0)',
    ]);
    expect(screen.getByRole('tab', { name: 'Info' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Takes (0)' }));
    expect(await screen.findByRole('heading', { name: 'Takes' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Takes (0)' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('lands an old address naming the retired Lineup tab on Info', async () => {
    renderSongPage('?tab=lineup');
    await screen.findByRole('heading', { name: 'Get Lucky' });
    expect(screen.getByRole('tab', { name: 'Info' }).getAttribute('aria-selected')).toBe('true');
  });

  it('opens on the Takes tab when the address selects a take', async () => {
    renderSongPage('?take=take-1');
    await screen.findByRole('heading', { name: 'Get Lucky' });
    expect(screen.getByRole('tab', { name: /^Takes/ }).getAttribute('aria-selected')).toBe('true');
  });
});
