import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { AppShell } from './AppShell';

const SIGNED_IN = {
  memberId: 'member-1',
  firstName: 'Gui',
  color: '#c0392b',
  username: 'gui',
  phone: null,
  email: null,
  calendarFeeds: [],
};

function answerShellApi(request: Request): Response {
  if (request.url.includes('/api/me')) return jsonResponse(SIGNED_IN);
  return new Response(null, { status: 404 });
}

function stubWideScreen(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

// @FollowsBlueprint test-component-render
describe('the signed-in card of the desktop sidebar', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubWideScreen();
    stub = stubFetch((request) => Promise.resolve(answerShellApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
    vi.unstubAllGlobals();
  });

  it('writes the member’s name above the version, the avatar beside it silent to a screen reader', async () => {
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <MemoryRouter initialEntries={['/']}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const name = await screen.findByText('Gui');
    const card = screen.getByRole('link', { name: 'Gui Pragma · v0.1' });
    expect(name.closest('a')).toBe(card);
    expect(card.textContent).toBe('GGuiPragma · v0.1');
  });
});
