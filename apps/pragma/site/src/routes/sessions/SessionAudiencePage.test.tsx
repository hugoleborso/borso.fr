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
import { SessionAudiencePage } from './SessionAudiencePage';

const CONCERT = {
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  kind: 'concert',
  date: '2026-11-01T19:00:00.000Z',
  venue: 'Le Petit Bain',
};

function answerAudienceApi(request: Request): Response {
  if (request.url.includes('/rounds')) return jsonResponse({ rounds: [] });
  if (request.url.includes('/audience') || request.url.includes('/vote')) {
    return jsonResponse({
      state: { round: null, pool: [], ownVotes: [], ballotCount: 0, capacity: null },
    });
  }
  if (request.url.includes(`/api/sessions/${CONCERT.id}`))
    return jsonResponse({ session: CONCERT });
  return new Response(null, { status: 404 });
}

// @FollowsBlueprint test-component-render
describe('the audience vote page of a concert', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stub = stubFetch((request) => Promise.resolve(answerAudienceApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('leads back to the concert and holds the round panel', async () => {
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <MemoryRouter initialEntries={[`/sessions/${CONCERT.id}/audience`]}>
          <Routes>
            <Route path="/sessions/:sessionId/audience" element={<SessionAudiencePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Audience vote' })).toBeTruthy();
    const back = screen.getByRole('link', { name: /Le Petit Bain/ });
    expect(back.getAttribute('href')).toBe(`/sessions/${CONCERT.id}`);
    expect(await screen.findByRole('button', { name: /thirty-second round/ })).toBeTruthy();
  });
});
