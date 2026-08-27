import { describe, expect, it } from 'vitest';
import {
  addSuggestedSongToPool,
  applyVoteToState,
  type ConcertStateCache,
  OPEN_ROUND_POLL_INTERVAL_MS,
  type RoundView,
  countSettledRounds,
  hasNewSettlement,
  selectHistoryPollInterval,
  selectPollInterval,
  withOpenedRound,
  withRoundAppended,
} from './audience.utils';

const RIFF_SONG_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const BALLAD_SONG_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
const INVENTED_SONG_ID = 'cccccccc-3333-4333-8333-333333333333';

function roundThatIs(isOpen: boolean): RoundView {
  return {
    id: 'round-1',
    openedAt: '2026-08-26T21:00:00.000Z',
    closesAt: '2026-08-26T21:00:30.000Z',
    remainingSeconds: 12,
    isOpen,
    isSettled: !isOpen,
    winningSongId: null,
  };
}

function roundClosedButNotSettled(): RoundView {
  return { ...roundThatIs(false), isSettled: false };
}

function cacheWith(overrides: Partial<ConcertStateCache['state']> = {}): ConcertStateCache {
  return {
    state: {
      round: roundThatIs(true),
      pool: [
        {
          songId: RIFF_SONG_ID,
          title: 'Riff',
          artist: 'The Band',
          status: 'concert_ready',
          voteCount: 2,
          isSuggestion: false,
        },
        {
          songId: BALLAD_SONG_ID,
          title: 'Ballad',
          artist: 'The Band',
          status: 'concert_ready',
          voteCount: 0,
          isSuggestion: false,
        },
      ],
      ownVotes: [],
      ballotCount: 1,
      capacity: 120,
      ...overrides,
    },
  };
}

describe('choosing the poll cadence from the last answer', () => {
  it('polls nothing before the first answer arrives', () => {
    expect(selectPollInterval(undefined)).toBe(false);
  });

  it('polls nothing at a concert that has never run a round', () => {
    expect(selectPollInterval(null)).toBe(false);
  });

  it('polls nothing once the round is settled', () => {
    expect(selectPollInterval(roundThatIs(false))).toBe(false);
  });

  it('keeps polling a closed round nobody has settled yet, which is what settles it', () => {
    expect(selectPollInterval(roundClosedButNotSettled())).toBe(OPEN_ROUND_POLL_INTERVAL_MS);
  });

  it('polls once a second while a round is open', () => {
    expect(selectPollInterval(roundThatIs(true))).toBe(OPEN_ROUND_POLL_INTERVAL_MS);
  });
});

describe('selectHistoryPollInterval', () => {
  it('polls nothing before the history has been read once', () => {
    expect(selectHistoryPollInterval(undefined)).toBe(false);
  });

  it('polls nothing at a concert that has run no round', () => {
    expect(selectHistoryPollInterval([])).toBe(false);
  });

  it('polls nothing once every round is settled, so the panel is quiet at rest', () => {
    expect(selectHistoryPollInterval([roundThatIs(false), roundThatIs(false)])).toBe(false);
  });

  it('keeps polling while one round is unsettled, which is how the winner reaches the panel', () => {
    expect(selectHistoryPollInterval([roundThatIs(false), roundClosedButNotSettled()])).toBe(
      OPEN_ROUND_POLL_INTERVAL_MS,
    );
  });

  it('keeps polling while a round is still open', () => {
    expect(selectHistoryPollInterval([roundThatIs(true)])).toBe(OPEN_ROUND_POLL_INTERVAL_MS);
  });
});

describe('countSettledRounds', () => {
  it('counts none before the history has been read once', () => {
    expect(countSettledRounds(undefined)).toBe(0);
  });

  it('counts none at a concert that has run no round', () => {
    expect(countSettledRounds({ rounds: [] })).toBe(0);
  });

  it('counts only the settled rounds, so an opened round does not look like a result', () => {
    expect(
      countSettledRounds({
        rounds: [roundThatIs(false), roundClosedButNotSettled(), roundThatIs(false)],
      }),
    ).toBe(2);
  });
});

describe('hasNewSettlement', () => {
  it('is true on the first answer that carries a settled round', () => {
    expect(hasNewSettlement({ rounds: [roundThatIs(false)] }, { rounds: [] })).toBe(true);
  });

  it('is true against a cache never read, which is a first load carrying a result', () => {
    expect(hasNewSettlement({ rounds: [roundThatIs(false)] }, undefined)).toBe(true);
  });

  it('is false when the answer settles nothing new, so the setlist is not refetched on every tick', () => {
    const settled = { rounds: [roundThatIs(false)] };
    expect(hasNewSettlement(settled, settled)).toBe(false);
  });

  it('is false when the answer only adds a round that is still running', () => {
    expect(
      hasNewSettlement(
        { rounds: [roundThatIs(false), roundThatIs(true)] },
        { rounds: [roundThatIs(false)] },
      ),
    ).toBe(false);
  });
});

describe('showing a vote before the server has answered', () => {
  it('leaves an empty cache alone', () => {
    expect(applyVoteToState(undefined, RIFF_SONG_ID, 'cast')).toBeUndefined();
  });

  it('adds the ballot to the song and moves its count up by one', () => {
    const after = applyVoteToState(cacheWith(), RIFF_SONG_ID, 'cast');
    expect(after?.state.ownVotes).toEqual([RIFF_SONG_ID]);
    expect(after?.state.pool[0]?.voteCount).toBe(3);
    expect(after?.state.pool[1]?.voteCount).toBe(0);
  });

  it('takes the ballot back off the song and moves its count down by one', () => {
    const after = applyVoteToState(
      cacheWith({ ownVotes: [RIFF_SONG_ID] }),
      RIFF_SONG_ID,
      'retract',
    );
    expect(after?.state.ownVotes).toEqual([]);
    expect(after?.state.pool[0]?.voteCount).toBe(1);
  });

  it('keeps the ballot on the other songs it holds', () => {
    const after = applyVoteToState(cacheWith({ ownVotes: [BALLAD_SONG_ID] }), RIFF_SONG_ID, 'cast');
    expect(after?.state.ownVotes).toEqual([BALLAD_SONG_ID, RIFF_SONG_ID]);
  });

  it('changes nothing when the ballot already stands where the tap would put it', () => {
    const alreadyVoted = cacheWith({ ownVotes: [RIFF_SONG_ID] });
    expect(applyVoteToState(alreadyVoted, RIFF_SONG_ID, 'cast')).toBe(alreadyVoted);
  });

  it('changes nothing on a retraction of a vote this ballot never cast', () => {
    const neverVoted = cacheWith();
    expect(applyVoteToState(neverVoted, RIFF_SONG_ID, 'retract')).toBe(neverVoted);
  });
});

describe('showing a suggestion before the next poll', () => {
  const INVENTED = {
    id: INVENTED_SONG_ID,
    title: 'Invented',
    artist: 'Someone Else',
    status: 'idea',
  } as const;

  it('leaves an empty cache alone', () => {
    expect(addSuggestedSongToPool(undefined, INVENTED)).toBeUndefined();
  });

  it('appends the song, marked as one the room asked for', () => {
    const after = addSuggestedSongToPool(cacheWith(), INVENTED);
    expect(after?.state.pool.at(-1)).toEqual({
      songId: INVENTED_SONG_ID,
      title: 'Invented',
      artist: 'Someone Else',
      status: 'idea',
      voteCount: 0,
      isSuggestion: true,
    });
  });

  it('adds nothing when the song is already in the pool', () => {
    const before = cacheWith();
    const after = addSuggestedSongToPool(before, {
      id: RIFF_SONG_ID,
      title: 'Riff',
      artist: 'The Band',
      status: 'concert_ready',
    });
    expect(after).toBe(before);
  });
});

describe('what the band sees the instant a round opens', () => {
  it('leaves an empty cache alone', () => {
    expect(withOpenedRound(undefined, roundThatIs(true))).toBeUndefined();
    expect(withRoundAppended(undefined, roundThatIs(true))).toBeUndefined();
  });

  it('shows the new round with every standing back at zero', () => {
    const after = withOpenedRound(cacheWith({ ownVotes: [RIFF_SONG_ID] }), roundThatIs(true));
    expect(after?.state.round?.id).toBe('round-1');
    expect(after?.state.ownVotes).toEqual([]);
    expect(after?.state.ballotCount).toBe(0);
    expect(after?.state.pool.map((entry) => entry.voteCount)).toEqual([0, 0]);
  });

  it('appends the round to the history the panel already holds', () => {
    const after = withRoundAppended({ rounds: [] }, roundThatIs(true));
    expect(after?.rounds).toHaveLength(1);
  });
});
