import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { AccountPage } from './AccountPage';

function renderAccountPage(path = '/account'): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the account page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    stub = stubFetch(() => Promise.resolve(new Response(null, { status: 404 })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    stub?.restore();
  });

  it('splits the account into tabs in a fixed header that links back to Band', () => {
    renderAccountPage();
    const header = screen.getByRole('heading', { level: 1, name: 'Account' }).closest('header');
    if (header === null) throw new Error('no page header');
    expect(header.classList.contains('sticky')).toBe(true);
    expect(within(header).getByRole('link', { name: 'Band' }).getAttribute('href')).toBe('/band');
    expect(
      within(header)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Profile', 'Sign-in', 'Calendar', 'Alerts', 'Language']);
    expect(screen.getByRole('tab', { name: 'Profile' }).getAttribute('aria-selected')).toBe('true');
  });

  it('shows the language switch only on its own tab', () => {
    renderAccountPage();
    expect(screen.queryByRole('heading', { name: 'Language' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Language' }));
    expect(screen.getByRole('heading', { name: 'Language' })).toBeTruthy();
  });

  it('opens the calendar tab from the address free slots link to', () => {
    renderAccountPage('/account?view=calendar');
    expect(screen.getByRole('tab', { name: 'Calendar' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });
});
