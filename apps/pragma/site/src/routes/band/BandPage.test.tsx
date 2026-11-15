import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { BandPage } from './BandPage';

const SECTION_PATHS = [
  '/tasks',
  '/members',
  '/instruments',
  '/bars',
  '/compos',
  '/inspirations',
  '/improvements',
  '/account',
];

function renderBandPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={['/band']}>
        <BandPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the band page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stub = stubFetch(() => Promise.resolve(jsonResponse({ bandLinks: [] })));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('is a menu of the band sections, Tasks first and the account last', () => {
    renderBandPage();
    const menu = screen.getByRole('navigation', { name: 'The band' });
    const links = within(menu).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(SECTION_PATHS);
    expect(links[0]?.textContent).toBe('Tasks');
  });

  it('keeps the band links under the menu', async () => {
    renderBandPage();
    expect(await screen.findByRole('heading', { name: 'Links' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add a link' })).toBeTruthy();
  });

  it('holds no task list and no tabs', () => {
    renderBandPage();
    expect(screen.queryByRole('tablist')).toBe(null);
    expect(screen.queryByRole('list', { name: 'My tasks' })).toBe(null);
  });
});
