import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './i18n/i18n.setup';
import { App } from './App';
import {
  createIsolatedQueryClient,
  jsonResponse,
  stubFetch,
} from './lib/queries/queries.test-utils';

// @FollowsBlueprint test-component-render
describe('the application shell', () => {
  let fetchStub: ReturnType<typeof stubFetch> | null = null;

  beforeEach(() => {
    localStorage.clear();
    globalThis.history.replaceState({}, '', '/vote');
  });

  afterEach(() => {
    cleanup();
    fetchStub?.restore();
    fetchStub = null;
    globalThis.history.replaceState({}, '', '/');
  });

  it('opens the vote page for a visitor with no session, without asking them to sign in', async () => {
    fetchStub = stubFetch(() => Promise.resolve(jsonResponse({ sessionId: null })));
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <App />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText(/No vote is running right now/)).toBeTruthy();
    });
    expect(screen.queryByLabelText(/password/i)).toBe(null);
    expect(fetchStub.calls.every((call) => !call.url.includes('/api/instruments'))).toBe(true);
  });

  it('names the screen-reader close button of a sheet in the language the visitor picked', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
    const original = i18next.language;
    await i18next.changeLanguage('fr');
    globalThis.history.replaceState({}, '', '/');
    fetchStub = stubFetch(() =>
      Promise.resolve(
        jsonResponse({
          concerts: [
            {
              sessionId: 'aaaaaaaa-1111-4111-8111-111111111111',
              date: '2026-11-28T20:30:00.000Z',
              venue: 'Le Pop-Up du Label',
              message: null,
              posterUrl: null,
              prize: null,
            },
          ],
        }),
      ),
    );
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <App />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Je serai là !' }));
    const dismissNames = (await screen.findAllByRole('button'))
      .map((button) => button.getAttribute('aria-label'))
      .filter((label) => label !== null);
    await i18next.changeLanguage(original);
    vi.unstubAllGlobals();
    expect(dismissNames).not.toContain('Dismiss');
    expect(dismissNames.length).toBeGreaterThan(0);
  });
});
