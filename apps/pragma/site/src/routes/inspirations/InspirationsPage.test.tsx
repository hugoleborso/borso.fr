import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { InspirationsPage } from './InspirationsPage';

const CALL_ME_MAYBE = {
  id: '11111111-1111-4111-8111-111111111111',
  youtubeVideoId: 'dQw4w9WgXcQ',
  title: 'Call Me Maybe',
  artist: 'Carly Rae Jepsen',
  deezerTrackId: '1234',
  deezerAlbumId: null,
  startSeconds: 52,
  endSeconds: 64,
  note: 'the trumpet',
  authorMemberId: null,
  authorName: null,
  createdAt: '2026-11-13T10:00:00.000Z',
  sketchCount: 1,
};

class SilentPlayer {
  getCurrentTime(): number {
    return 0;
  }
  destroy(): void {
    return undefined;
  }
}

function answerApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/inspirations') return jsonResponse({ inspirations: [CALL_ME_MAYBE] });
  if (pathname === `/api/inspirations/${CALL_ME_MAYBE.id}` && request.method === 'DELETE') {
    return jsonResponse(
      { error: 'inspiration-in-use', sketches: [{ songId: 'song-1', title: 'New 7' }] },
      409,
    );
  }
  return new Response(null, { status: 404 });
}

function renderInspirationsPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={['/inspirations']}>
        <InspirationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the inspirations page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    vi.stubGlobal('YT', { Player: SilentPlayer });
    stub = stubFetch((request) => Promise.resolve(answerApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
    vi.unstubAllGlobals();
  });

  it('shows each passage with its range, its note, a former member and its sketch count', async () => {
    renderInspirationsPage();
    const card = (await screen.findByRole('heading', { name: 'Call Me Maybe' })).closest('article');
    expect(card).not.toBeNull();
    const text = card?.textContent ?? '';
    expect(text).toContain('Carly Rae Jepsen · 0:52\u00A0→\u00A01:04');
    expect(text).toContain('the trumpet');
    expect(text).toContain('former member · in 1 sketch');
  });

  it('opens the form from the one primary action', async () => {
    renderInspirationsPage();
    await screen.findByRole('heading', { name: 'Call Me Maybe' });
    fireEvent.click(screen.getByRole('button', { name: 'New inspiration' }));
    const sheet = screen.getByRole('dialog', { name: 'New inspiration' });
    expect(within(sheet).getByLabelText('YouTube link')).toBeTruthy();
  });

  it('opens the same form filled in from Edit', async () => {
    renderInspirationsPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Call Me Maybe' }));
    const sheet = screen.getByRole('dialog', { name: 'Edit the inspiration' });
    const link = within(sheet).getByLabelText('YouTube link');
    expect(link instanceof HTMLInputElement ? link.value : '').toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=52',
    );
  });

  it('names the sketch that refuses the deletion and keeps the card', async () => {
    renderInspirationsPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Call Me Maybe' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'Used by New 7. Remove its clips there first.',
      ),
    );
    expect(screen.getByRole('heading', { name: 'Call Me Maybe' })).toBeTruthy();
  });
});
