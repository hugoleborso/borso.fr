import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from '../../components/molecules/sheet.test-utils';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { ComposPage } from './ComposPage';

function composition(id: string, title: string): Record<string, unknown> {
  return {
    id,
    title,
    artist: '',
    status: 'wip',
    origin: 'original',
    album: null,
    durationSeconds: null,
    deezerAlbumId: null,
    deezerTrackId: null,
    spotifyTrackId: null,
    tonalityStart: null,
    tonalityEnd: null,
    baseEnergy: null,
    tags: [],
    isrcs: [],
    chart: null,
    links: [],
    defaultLineup: {},
    structureNotes: '',
    gimmickNotes: '',
    notes: '',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

const SONGS = [
  composition('song-1', 'Respire encore un peu'),
  composition('song-2', 'Nuit blanche'),
  composition('song-3', 'Le phare'),
];

function answerApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/songs') return jsonResponse({ songs: SONGS });
  if (pathname === '/api/members') return jsonResponse({ members: [] });
  if (pathname === '/api/instruments') return jsonResponse({ instruments: [] });
  if (pathname === '/api/tasks') return jsonResponse({ tasks: [] });
  return new Response(null, { status: 404 });
}

function stubViewport(isNarrow: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: isNarrow,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function renderComposPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={['/compos']}>
        <ComposPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the compositions page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubSheetDialog();
    stub = stubFetch((request) => Promise.resolve(answerApi(request)));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    stub?.restore();
  });

  it('on a phone, shows only the list and opens a composition in a sheet', async () => {
    stubViewport(true);
    renderComposPage();
    const row = await screen.findByRole('button', { name: /Nuit blanche/ });
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    fireEvent.click(row);
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByRole('heading', { level: 2, name: 'Nuit blanche' })).toBeTruthy();
  });

  it('on a wide screen, shows the first composition beside the list', async () => {
    stubViewport(false);
    renderComposPage();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Respire encore un peu' }),
    ).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('links back to Band from its fixed header', async () => {
    stubViewport(true);
    renderComposPage();
    const header = screen
      .getByRole('heading', { level: 1, name: 'Compositions' })
      .closest('header');
    expect(header?.classList.contains('sticky')).toBe(true);
    expect(header?.querySelector('a')?.getAttribute('href')).toBe('/band');
  });
});
