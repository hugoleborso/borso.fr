import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { SketchPage } from './SketchPage';

const COMPOSITION_ID = '11111111-1111-4111-8111-111111111111';
const SONG_ID = '22222222-2222-4222-8222-222222222222';
const SERVER_ERROR_STATUS = 503;

function compositionWith(songId: string | null) {
  return {
    id: COMPOSITION_ID,
    title: 'Avignon Nice',
    songId,
    createdAt: '2026-11-13T10:00:00.000Z',
  };
}

function answerApi(songId: string | null, catalogueStatus: number) {
  return (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (pathname === `/api/sketches/${COMPOSITION_ID}`) {
      return Promise.resolve(
        jsonResponse({ sketch: { composition: compositionWith(songId), lanes: [], clips: [] } }),
      );
    }
    if (pathname === '/api/inspirations') {
      return Promise.resolve(jsonResponse({ inspirations: [] }));
    }
    if (pathname === `/api/compositions/${COMPOSITION_ID}/catalogue`) {
      return Promise.resolve(jsonResponse({ error: 'unavailable' }, catalogueStatus));
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  };
}

function renderSketchPage(): ReturnType<typeof createIsolatedQueryClient> {
  const queryClient = createIsolatedQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/compos/${COMPOSITION_ID}/sketch`]}>
        <Routes>
          <Route path="/compos/:compositionId/sketch" element={<SketchPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

// @FollowsBlueprint test-component-render
describe('the sketch page', () => {
  let stub: FetchStub | null = null;

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('offers to add the composition to the catalogue while no song links it, as after its song is deleted', async () => {
    stub = stubFetch(answerApi(null, SERVER_ERROR_STATUS));
    renderSketchPage();

    expect(await screen.findByRole('button', { name: 'Add to catalogue' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Open the song' })).toBeNull();
    expect(screen.queryByText('In the catalogue')).toBeNull();
  });

  it('opens the catalogue song instead once a song links the composition', async () => {
    stub = stubFetch(answerApi(SONG_ID, SERVER_ERROR_STATUS));
    renderSketchPage();

    const songLink = await screen.findByRole('link', { name: 'Open the song' });
    expect(songLink.getAttribute('href')).toBe(`/catalog/${SONG_ID}`);
    expect(screen.queryByRole('button', { name: 'Add to catalogue' })).toBeNull();
    expect(screen.getByText('In the catalogue')).toBeTruthy();
  });

  it('says the composition was not added when the catalogue write fails, and lets the member try again', async () => {
    stub = stubFetch(answerApi(null, SERVER_ERROR_STATUS));
    renderSketchPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add to catalogue' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'The composition was not added to the catalogue. Try again.',
    );
    expect(screen.getByRole('button', { name: 'Add to catalogue' })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it("drops the failure once another member's catalogue links the composition", async () => {
    let songId: string | null = null;
    stub = stubFetch((request) => answerApi(songId, SERVER_ERROR_STATUS)(request));
    const queryClient = renderSketchPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add to catalogue' }));
    await screen.findByRole('alert');

    songId = SONG_ID;
    await queryClient.invalidateQueries();

    expect(await screen.findByRole('link', { name: 'Open the song' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
