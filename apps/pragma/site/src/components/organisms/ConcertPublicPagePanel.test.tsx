import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { ConcertPublicPagePanel } from './ConcertPublicPagePanel';

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const ANNOUNCEMENT = {
  message: 'Free entry',
  posterUrl: 'https://cdn.example/poster.png',
  prizeLabel: '3 beers',
  prizeIcon: 'beer',
};

const activeStubs: FetchStub[] = [];

function renderPanel(): FetchStub {
  const fetchStub = stubFetch(async (request) => {
    if (request.method === 'PATCH') {
      const changes: unknown = await request.clone().json();
      return jsonResponse({ ...ANNOUNCEMENT, ...Object(changes), posterUrl: null });
    }
    if (request.url.includes('/registrations')) return jsonResponse({ registrations: [] });
    return jsonResponse(ANNOUNCEMENT);
  });
  activeStubs.push(fetchStub);
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <ConcertPublicPagePanel sessionId={A_CONCERT} />
    </QueryClientProvider>,
  );
  return fetchStub;
}

async function readBody(call: Request): Promise<unknown> {
  const body: unknown = await call.clone().json();
  return body;
}

async function sentPatches(fetchStub: FetchStub): Promise<unknown[]> {
  const patches = fetchStub.calls.filter((call) => call.method === 'PATCH');
  return await Promise.all(patches.map(readBody));
}

// @FollowsBlueprint test-component-render
describe('the public page tab of a concert', () => {
  afterEach(() => {
    cleanup();
    for (const stub of activeStubs.splice(0)) stub.restore();
  });

  it('saves the prize with the icon picked, and clears a blank message', async () => {
    const fetchStub = renderPanel();
    const label = await screen.findByLabelText('Prize to win');
    fireEvent.change(label, { target: { value: ' 2 tickets ' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Ticket' }));
    fireEvent.change(screen.getByLabelText('Public message'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => {
      expect(await sentPatches(fetchStub)).toEqual([
        { message: null, prizeLabel: '2 tickets', prizeIcon: 'ticket' },
      ]);
    });
  });

  it('removes the poster', async () => {
    const fetchStub = renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    await waitFor(async () => {
      expect(await sentPatches(fetchStub)).toEqual([{ posterS3Key: null }]);
    });
    expect(await screen.findByText('Add a poster')).toBeTruthy();
  });
});
