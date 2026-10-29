import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { SessionsPage } from './SessionsPage';

const DAY_MS = 86_400_000;

function sessionAt(id: string, kind: string, daysFromNow: number, venue: string | null) {
  return {
    id,
    kind,
    date: new Date(Date.now() + daysFromNow * DAY_MS).toISOString(),
    venue,
    preparedConcertId: null,
    capacity: null,
    gear: null,
    friendsCountPerMember: null,
  };
}

const FAR_CONCERT = sessionAt('far-concert', 'concert', 20, 'La Cigale');
const NEAR_PRACTICE = sessionAt('near-practice', 'practice', 2, null);
const RECENT_PRACTICE = sessionAt('recent-practice', 'practice', -2, null);
const OLD_CONCERT = sessionAt('old-concert', 'concert', -30, 'Le Petit Bain');

function renderSessionsPage(address = '/sessions'): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={[address]}>
        <SessionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function listedSessionPaths(): string[] {
  return screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '')
    .filter((path) => /^\/sessions\/[^/]+$/.test(path) && path !== '/sessions/slots');
}

// @FollowsBlueprint test-component-render
describe('the sessions list', () => {
  let stub: FetchStub | null = null;

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  function answerSessions(): void {
    stub = stubFetch((request) => {
      const { pathname } = new URL(request.url);
      if (pathname === '/api/sessions') {
        return Promise.resolve(
          jsonResponse({ sessions: [OLD_CONCERT, FAR_CONCERT, RECENT_PRACTICE, NEAR_PRACTICE] }),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
  }

  it('lists only the upcoming sessions by default, nearest first', async () => {
    answerSessions();
    renderSessionsPage();
    await screen.findByText('La Cigale');
    expect(screen.getByRole('radio', { name: 'Upcoming' })).toHaveProperty('checked', true);
    expect(listedSessionPaths()).toEqual([
      `/sessions/${NEAR_PRACTICE.id}`,
      `/sessions/${FAR_CONCERT.id}`,
    ]);
  });

  it('lists only the past sessions, newest first, once Past is chosen', async () => {
    answerSessions();
    renderSessionsPage();
    await screen.findByText('La Cigale');
    fireEvent.click(screen.getByRole('radio', { name: 'Past' }));
    expect(listedSessionPaths()).toEqual([
      `/sessions/${RECENT_PRACTICE.id}`,
      `/sessions/${OLD_CONCERT.id}`,
    ]);
    fireEvent.click(screen.getByRole('radio', { name: 'Upcoming' }));
    expect(listedSessionPaths()).toEqual([
      `/sessions/${NEAR_PRACTICE.id}`,
      `/sessions/${FAR_CONCERT.id}`,
    ]);
  });

  it('keeps the concerts filter on the past sessions read from the address', async () => {
    answerSessions();
    renderSessionsPage('/sessions?when=past');
    await screen.findByText('Le Petit Bain');
    const filter = screen.getByRole('button', { name: 'Concerts only' });
    fireEvent.click(filter);
    expect(filter.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Past' })).toHaveProperty('checked', true);
    expect(listedSessionPaths()).toEqual([`/sessions/${OLD_CONCERT.id}`]);
    fireEvent.click(filter);
    expect(listedSessionPaths()).toEqual([
      `/sessions/${RECENT_PRACTICE.id}`,
      `/sessions/${OLD_CONCERT.id}`,
    ]);
  });

  it('says so when the chosen side holds no session', async () => {
    stub = stubFetch(() => Promise.resolve(jsonResponse({ sessions: [FAR_CONCERT] })));
    renderSessionsPage('/sessions?when=past');
    expect(await screen.findByText('No past session.')).toBeTruthy();
    expect(listedSessionPaths()).toEqual([]);
  });
});
