import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { stubSheetDialog } from '../molecules/sheet.test-utils';
import { AddSongSheet } from './AddSongSheet';

const HIT = {
  deezerTrackId: '67238735',
  title: 'Get Lucky',
  artist: 'Daft Punk',
  album: 'Random Access Memories',
  deezerAlbumId: '6575789',
  durationSeconds: 369,
  durationLabel: '6:09',
  titleVersion: null,
  isrcs: ['USQX91300108'],
  popularity: 1,
  isExplicit: false,
};

function answerSongsApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/songs/search') return jsonResponse({ hits: [HIT] });
  if (pathname === '/api/songs' && request.method === 'POST') {
    return jsonResponse({ song: { id: 'song-new', title: HIT.title } }, 201);
  }
  if (pathname === '/api/songs') return jsonResponse({ songs: [] });
  return new Response(null, { status: 404 });
}

function renderSheet(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={['/catalog']}>
        <Routes>
          <Route
            path="/catalog"
            element={<AddSongSheet initialTitle="get luck" onClose={vi.fn()} />}
          />
          <Route path="/catalog/:songId" element={<p>Song page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('AddSongSheet', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubSheetDialog();
    stub = stubFetch((request) => Promise.resolve(answerSongsApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('starts on the title, focused, carrying what was searched', () => {
    renderSheet();
    const title = screen.getByLabelText('Title');
    expect(title).toHaveProperty('value', 'get luck');
    expect(document.activeElement).toBe(title);
  });

  it("fills title and artist from the music service's result and creates the song with its cover", async () => {
    renderSheet();
    fireEvent.click(await screen.findByRole('button', { name: /Get Lucky/ }));

    expect(screen.getByLabelText('Title')).toHaveProperty('value', 'Get Lucky');
    expect(screen.getByLabelText('Artist')).toHaveProperty('value', 'Daft Punk');

    fireEvent.click(screen.getByRole('button', { name: 'Add a song' }));

    expect(await screen.findByText('Song page')).toBeTruthy();
    const creation = stub?.calls.find((request) => request.method === 'POST');
    await waitFor(async () => {
      expect(await creation?.clone().json()).toMatchObject({
        title: 'Get Lucky',
        artist: 'Daft Punk',
        status: 'idea',
        deezerAlbumId: '6575789',
      });
    });
  });
});
