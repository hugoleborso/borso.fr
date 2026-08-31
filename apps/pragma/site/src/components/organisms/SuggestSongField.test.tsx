import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { SuggestSongField } from './SuggestSongField';

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const A_BALLOT = 'a'.repeat(48);
const THROTTLED_STATUS = 503;

// @FollowsBlueprint test-component-render
describe('the field that asks for a song the band does not have', () => {
  let fetchStub: ReturnType<typeof stubFetch> | null = null;

  function renderField(handler: (request: Request) => Promise<Response>): void {
    fetchStub = stubFetch(handler);
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <SuggestSongField sessionId={A_CONCERT} ballotToken={A_BALLOT} />
      </QueryClientProvider>,
    );
  }

  afterEach(() => {
    cleanup();
    fetchStub?.restore();
    fetchStub = null;
  });

  it('states the search was refused rather than showing an empty result list', async () => {
    const user = userEvent.setup();
    renderField(() =>
      Promise.resolve(jsonResponse({ error: 'external-search-unavailable' }, THROTTLED_STATUS)),
    );
    await user.type(screen.getByRole('searchbox'), 'get lucky');
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('The song search is unavailable');
    });
    expect(screen.queryByText(/Nothing found under that name/)).toBe(null);
  });

  it('says nothing was found when the search answered with no result', async () => {
    const user = userEvent.setup();
    renderField(() => Promise.resolve(jsonResponse({ hits: [] })));
    await user.type(screen.getByRole('searchbox'), 'get lucky');
    await waitFor(() => {
      expect(screen.getByText(/Nothing found under that name/)).toBeTruthy();
    });
  });

  it('sends the picked result and nothing the visitor typed', async () => {
    const user = userEvent.setup();
    renderField((request) => {
      if (request.method === 'POST') {
        return Promise.resolve(
          jsonResponse(
            { song: { id: 'song-1', title: 'Get Lucky', artist: 'Daft Punk', status: 'idea' } },
            201,
          ),
        );
      }
      return Promise.resolve(
        jsonResponse({ hits: [{ trackId: 'dz-1', title: 'Get Lucky', artist: 'Daft Punk' }] }),
      );
    });
    await user.type(screen.getByRole('searchbox'), 'get lucky');
    const pickedHit = await screen.findByRole('button', { name: /Get Lucky/ });
    await user.click(pickedHit);
    await waitFor(() => {
      expect(fetchStub?.calls.some((call) => call.method === 'POST')).toBe(true);
    });
    const write = fetchStub?.calls.find((call) => call.method === 'POST');
    expect(write?.headers.get('x-ballot-token')).toBe(A_BALLOT);
    expect(await write?.json()).toEqual({ trackId: 'dz-1' });
  });
});
