import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { SessionDetailPage } from './SessionDetailPage';

const CONCERT = {
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  kind: 'concert',
  date: '2026-11-01T19:00:00.000Z',
  venue: 'Le Petit Bain',
  capacity: null,
  gear: null,
  friendsCountPerMember: {},
  preparedConcertId: null,
};

function answerSessionApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === `/api/sessions/${CONCERT.id}`) return jsonResponse({ session: CONCERT });
  if (pathname === '/api/sessions') return jsonResponse({ sessions: [CONCERT] });
  if (pathname === '/api/members') return jsonResponse({ members: [] });
  if (pathname.includes('setlists')) return jsonResponse({ setlists: [] });
  return new Response(null, { status: 404 });
}

// @FollowsBlueprint test-component-render
describe('the concert page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stub = stubFetch((request) => Promise.resolve(answerSessionApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('reaches the audience vote through one link and carries no vote block itself', async () => {
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <MemoryRouter initialEntries={[`/sessions/${CONCERT.id}`]}>
          <Routes>
            <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const audienceLink = await screen.findByRole('link', { name: 'Audience vote' });
    expect(audienceLink.getAttribute('href')).toBe(`/sessions/${CONCERT.id}/audience`);
    expect(audienceLink.dataset.variant).toBe('secondary');
    expect(screen.queryByRole('button', { name: /thirty-second round/ })).toBeNull();
    expect(screen.queryByText(/vote\//)).toBeNull();
  });
});
