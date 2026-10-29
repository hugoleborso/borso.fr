import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { CatalogPage } from './CatalogPage';

function answerCatalogApi(request: Request): Response {
  if (request.url.includes('/api/songs')) return jsonResponse({ songs: [] });
  if (request.url.includes('/api/instruments')) return jsonResponse({ instruments: [] });
  return new Response(null, { status: 404 });
}

function renderCatalogPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={['/catalog']}>
        <CatalogPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the songs page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stub = stubFetch((request) => Promise.resolve(answerCatalogApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('pins the title, the search and the filters together at the top', () => {
    renderCatalogPage();
    const pinned = screen.getByRole('heading', { level: 1, name: 'Songs' }).closest('.sticky');
    expect(pinned).not.toBeNull();
    expect(pinned?.classList.contains('top-0')).toBe(true);
    expect(pinned?.contains(screen.getByRole('searchbox'))).toBe(true);
    expect(pinned?.contains(screen.getByRole('group', { name: 'Show' }))).toBe(true);
    expect(pinned?.querySelector('[class*="overflow-y"]')).toBeNull();
  });

  it('opens the Add a song page, carrying no title when nothing was searched', () => {
    renderCatalogPage();
    const addSong = screen.getByRole('link', { name: 'Add a song' });
    expect(addSong.getAttribute('href')).toBe('/catalog/add');
    expect(addSong.dataset.variant).toBe('primary');
  });
});
