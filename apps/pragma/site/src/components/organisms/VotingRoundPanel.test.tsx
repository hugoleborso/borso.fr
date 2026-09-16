import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { VotingRoundPanel } from './VotingRoundPanel';

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const ROUND_MS = 30_000;

function openRound() {
  const openedAt = new Date();
  return {
    id: 'bbbbbbbb-2222-4222-8222-222222222222',
    openedAt: openedAt.toISOString(),
    closesAt: new Date(openedAt.getTime() + ROUND_MS).toISOString(),
    remainingSeconds: 30,
    isOpen: true,
    isSettled: false,
    winningSongId: null,
  };
}

function stateWith(pool: readonly Record<string, unknown>[]) {
  return {
    state: {
      round: openRound(),
      pool,
      ownVotes: [],
      ballotCount: 3,
      capacity: 100,
    },
  };
}

// @FollowsBlueprint test-component-render
describe('the panel the band watches from the stage', () => {
  let fetchStub: ReturnType<typeof stubFetch> | null = null;

  function renderPanel(pool: readonly Record<string, unknown>[]): void {
    fetchStub = stubFetch((request) => {
      if (request.url.includes('/rounds')) return Promise.resolve(jsonResponse({ rounds: [] }));
      return Promise.resolve(jsonResponse(stateWith(pool)));
    });
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <VotingRoundPanel sessionId={A_CONCERT} />
      </QueryClientProvider>,
    );
  }

  afterEach(() => {
    cleanup();
    fetchStub?.restore();
    fetchStub = null;
  });

  it('shows the live standing, so the band knows what the room is choosing', async () => {
    renderPanel([
      {
        songId: 'song-1',
        title: 'Slow Burn',
        artist: 'The Embers',
        status: 'concert_ready',
        voteCount: 7,
        isSuggestion: false,
      },
      {
        songId: 'song-2',
        title: 'Afterglow',
        artist: 'Nova Reef',
        status: 'concert_ready',
        voteCount: 2,
        isSuggestion: false,
      },
    ]);
    await waitFor(() => {
      expect(screen.getByText('Slow Burn')).toBeTruthy();
    });
    expect(screen.getByText('Afterglow')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('shows a song the room asked for, marked as not necessarily concert ready', async () => {
    renderPanel([
      {
        songId: 'song-3',
        title: 'Get Lucky',
        artist: 'Daft Punk',
        status: 'idea',
        voteCount: 4,
        isSuggestion: true,
      },
    ]);
    await waitFor(() => {
      expect(screen.getByText('Get Lucky')).toBeTruthy();
    });
    expect(screen.getByText('asked for by the room')).toBeTruthy();
  });

  it('says the pool is empty rather than showing nothing at all', async () => {
    renderPanel([]);
    await waitFor(() => {
      expect(screen.getByText(/Nothing to vote for yet/)).toBeTruthy();
    });
  });
});
