import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  flushMicrotasks,
  flushTasks,
  jsonResponse,
  mountWithClient,
  type MountedTree,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { VotePage } from './VotePage';

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const RIFF_SONG_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
const A_BALLOT = 'a'.repeat(48);
const A_STALE_BALLOT = 'b'.repeat(48);
const BALLOT_STORAGE_KEY = `pragma.ballot.${A_CONCERT}`;

const CLOSED_ROUND_STATE = {
  state: {
    round: null,
    pool: [],
    ownVotes: [],
    ballotCount: 0,
    capacity: 120,
  },
};

function openRoundState(ownVotes: readonly string[]) {
  const openedAt = new Date(Date.now() - 5_000).toISOString();
  const closesAt = new Date(Date.now() + 25_000).toISOString();
  return {
    state: {
      round: {
        id: 'round-1',
        openedAt,
        closesAt,
        remainingSeconds: 25,
        isOpen: true,
        isSettled: false,
        winningSongId: null,
      },
      pool: [
        {
          songId: RIFF_SONG_ID,
          title: 'Riff',
          artist: 'The Band',
          status: 'concert_ready',
          voteCount: 2,
          isSuggestion: false,
        },
      ],
      ownVotes,
      ballotCount: 1,
      capacity: 120,
    },
  };
}

const FLUSH_ATTEMPTS_MAX = 8;
const WRITES_OF_ONE_RETRIED_VOTE = 2;

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | null {
  const buttons = [...container.querySelectorAll('button')];
  return buttons.find((button) => button.textContent.includes(text)) ?? null;
}

async function flushUntil(hasSettled: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < FLUSH_ATTEMPTS_MAX; attempt += 1) {
    await flushMicrotasks();
    if (hasSettled()) return;
    await flushTasks();
    if (hasSettled()) return;
  }
  throw new Error('the page never reached the state this case waits for');
}

// @FollowsBlueprint test-component-render
describe('the public vote page', () => {
  let tree: MountedTree | null = null;
  let fetchStub: ReturnType<typeof stubFetch> | null = null;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    tree?.unmount();
    tree = null;
    fetchStub?.restore();
    fetchStub = null;
  });

  async function renderVotePage(handler: (request: Request) => Promise<Response>): Promise<void> {
    fetchStub = stubFetch(handler);
    tree = mountWithClient(
      createIsolatedQueryClient(),
      <MemoryRouter initialEntries={[`/vote/${A_CONCERT}`]}>
        <Routes>
          <Route path="/vote/:sessionId" element={<VotePage />} />
        </Routes>
      </MemoryRouter>,
    );
    await flushMicrotasks();
  }

  function voteRow(): HTMLButtonElement | null {
    return findButtonByText(tree?.container ?? document.body, 'Riff');
  }

  it('mints one ballot on first contact and keeps it in local storage', async () => {
    await renderVotePage((request) => {
      if (request.url.includes('/ballot')) {
        return Promise.resolve(jsonResponse({ ballotToken: A_BALLOT }, 201));
      }
      return Promise.resolve(jsonResponse(CLOSED_ROUND_STATE));
    });
    await flushUntil(() => localStorage.getItem(`pragma.ballot.${A_CONCERT}`) !== null);
    expect(localStorage.getItem(`pragma.ballot.${A_CONCERT}`)).toBe(A_BALLOT);
    const mints = fetchStub?.calls.filter((call) => call.url.includes('/ballot')) ?? [];
    expect(mints).toHaveLength(1);
  });

  it('says no vote is running and offers a refresh control at rest', async () => {
    await renderVotePage((request) => {
      if (request.url.includes('/ballot')) {
        return Promise.resolve(jsonResponse({ ballotToken: A_BALLOT }, 201));
      }
      return Promise.resolve(jsonResponse(CLOSED_ROUND_STATE));
    });
    await flushUntil(() => tree?.container.textContent.includes('No vote is open') === true);
    expect(tree?.container.textContent).toContain('No vote is open at the moment');
    expect(findButtonByText(tree?.container ?? document.body, 'Refresh')).not.toBe(null);
  });

  it('casts a vote on the first tap and retracts it on the second', async () => {
    localStorage.setItem(`pragma.ballot.${A_CONCERT}`, A_BALLOT);
    let ownVotes: readonly string[] = [];
    await renderVotePage((request) => {
      if (request.method === 'POST' && request.url.includes('/votes')) {
        ownVotes = [RIFF_SONG_ID];
        return Promise.resolve(jsonResponse({ roundId: 'round-1', songId: RIFF_SONG_ID }, 201));
      }
      if (request.method === 'DELETE') {
        ownVotes = [];
        return Promise.resolve(jsonResponse({ roundId: 'round-1', songId: RIFF_SONG_ID }));
      }
      return Promise.resolve(jsonResponse(openRoundState(ownVotes)));
    });

    await flushUntil(() => voteRow() !== null);
    expect(voteRow()?.getAttribute('aria-pressed')).toBe('false');

    voteRow()?.click();
    await flushMicrotasks();
    expect(
      fetchStub?.calls.some((call) => call.method === 'POST' && call.url.includes('/votes')),
    ).toBe(true);
    expect(voteRow()?.getAttribute('aria-pressed')).toBe('true');

    voteRow()?.click();
    await flushMicrotasks();
    expect(fetchStub?.calls.some((call) => call.method === 'DELETE')).toBe(true);
    expect(voteRow()?.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows the count the tap moved, before the server has answered', async () => {
    localStorage.setItem(`pragma.ballot.${A_CONCERT}`, A_BALLOT);
    await renderVotePage((request) => {
      if (request.method === 'POST' && request.url.includes('/votes')) {
        return Promise.resolve(jsonResponse({ roundId: 'round-1', songId: RIFF_SONG_ID }, 201));
      }
      return Promise.resolve(jsonResponse(openRoundState([])));
    });
    await flushUntil(() => voteRow() !== null);
    voteRow()?.click();
    await flushMicrotasks();
    expect(voteRow()?.textContent).toContain('3');
  });

  it('mints a fresh ballot and sends the vote again when the server refuses the remembered one', async () => {
    localStorage.setItem(BALLOT_STORAGE_KEY, A_STALE_BALLOT);
    await renderVotePage((request) => {
      if (request.url.includes('/ballot')) {
        return Promise.resolve(jsonResponse({ ballotToken: A_BALLOT }, 201));
      }
      if (request.method === 'POST' && request.url.includes('/votes')) {
        const isStale = request.headers.get('x-ballot-token') === A_STALE_BALLOT;
        if (isStale) return Promise.resolve(jsonResponse({ error: 'ballot-required' }, 401));
        return Promise.resolve(jsonResponse({ roundId: 'round-1', songId: RIFF_SONG_ID }, 201));
      }
      return Promise.resolve(jsonResponse(openRoundState([])));
    });

    await flushUntil(() => voteRow() !== null);
    voteRow()?.click();
    await flushUntil(() => localStorage.getItem(BALLOT_STORAGE_KEY) === A_BALLOT);

    const writes = fetchStub?.calls.filter(
      (call) => call.method === 'POST' && call.url.includes('/votes'),
    );
    expect(writes).toHaveLength(2);
    expect(writes?.[0]?.headers.get('x-ballot-token')).toBe(A_STALE_BALLOT);
    expect(writes?.[1]?.headers.get('x-ballot-token')).toBe(A_BALLOT);
    expect(localStorage.getItem(BALLOT_STORAGE_KEY)).toBe(A_BALLOT);
  });

  it('gives up after that one retry rather than minting a ballot per attempt', async () => {
    localStorage.setItem(BALLOT_STORAGE_KEY, A_STALE_BALLOT);
    await renderVotePage((request) => {
      if (request.url.includes('/ballot')) {
        return Promise.resolve(jsonResponse({ ballotToken: A_BALLOT }, 201));
      }
      if (request.method === 'POST' && request.url.includes('/votes')) {
        return Promise.resolve(jsonResponse({ error: 'ballot-required' }, 401));
      }
      return Promise.resolve(jsonResponse(openRoundState([])));
    });

    const writesSoFar = () =>
      fetchStub?.calls.filter((call) => call.method === 'POST' && call.url.includes('/votes')) ??
      [];

    await flushUntil(() => voteRow()?.disabled === false);
    voteRow()?.click();
    await flushUntil(
      () =>
        writesSoFar().length === WRITES_OF_ONE_RETRIED_VOTE &&
        voteRow()?.getAttribute('aria-pressed') === 'false',
    );

    const mints = fetchStub?.calls.filter((call) => call.url.includes('/ballot')) ?? [];
    expect(writesSoFar()).toHaveLength(WRITES_OF_ONE_RETRIED_VOTE);
    expect(mints).toHaveLength(1);
    expect(voteRow()?.getAttribute('aria-pressed')).toBe('false');
  });

  it('carries the ballot token on every write, so the server can tell one browser from another', async () => {
    localStorage.setItem(`pragma.ballot.${A_CONCERT}`, A_BALLOT);
    await renderVotePage((request) => {
      if (request.method === 'POST' && request.url.includes('/votes')) {
        return Promise.resolve(jsonResponse({ roundId: 'round-1', songId: RIFF_SONG_ID }, 201));
      }
      return Promise.resolve(jsonResponse(openRoundState([])));
    });
    await flushUntil(() => voteRow() !== null);
    voteRow()?.click();
    await flushMicrotasks();
    const write = fetchStub?.calls.find(
      (call) => call.method === 'POST' && call.url.includes('/votes'),
    );
    expect(write?.headers.get('x-ballot-token')).toBe(A_BALLOT);
  });
});
