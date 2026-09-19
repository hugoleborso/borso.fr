import { describe, expect, it } from 'vitest';
import {
  assembleBidTable,
  countFreeSeats,
  hasRoundTimerExpired,
  narrowGameStatus,
  refuseJoin,
  refuseStart,
  selectGameWinners,
  selectMissingBidders,
  selectWinnersWhenFinished,
} from './game.core';

// @FollowsBlueprint test-pure-unit
describe('refuseStart', () => {
  it('allows a lobby holding enough players', () => {
    expect(refuseStart('lobby', 2)).toBeNull();
  });

  it('refuses a game that is already running', () => {
    expect(refuseStart('playing', 4)).toBe('not-in-lobby');
  });

  it('refuses a lobby holding one player', () => {
    expect(refuseStart('lobby', 1)).toBe('not-enough-players');
  });
});

describe('refuseJoin', () => {
  it('allows a free seat in a lobby', () => {
    expect(refuseJoin('lobby', 2, 4, ['chimp'], 'gibbon')).toBeNull();
  });

  it('refuses a game that has already started', () => {
    expect(refuseJoin('playing', 1, 4, [], 'gibbon')).toBe('already-started');
  });

  it('refuses a full table', () => {
    expect(refuseJoin('lobby', 4, 4, [], 'gibbon')).toBe('game-full');
  });

  it('refuses a monkey somebody else already picked', () => {
    expect(refuseJoin('lobby', 1, 4, ['gibbon'], 'gibbon')).toBe('avatar-taken');
  });
});

describe('countFreeSeats', () => {
  it('counts the seats still open', () => {
    expect(countFreeSeats(3, 8)).toBe(5);
  });

  it('never counts below zero', () => {
    expect(countFreeSeats(9, 8)).toBe(0);
  });
});

describe('selectGameWinners', () => {
  it('names nobody while everyone is short of the score', () => {
    expect(selectGameWinners([{ playerId: 'me', stash: 199 }], 200)).toEqual([]);
  });

  it('names a player sitting exactly on the score', () => {
    expect(selectGameWinners([{ playerId: 'me', stash: 200 }], 200)).toEqual(['me']);
  });

  it('names the player who reached the score', () => {
    expect(
      selectGameWinners(
        [
          { playerId: 'me', stash: 210 },
          { playerId: 'you', stash: 40 },
        ],
        200,
      ),
    ).toEqual(['me']);
  });

  it('names the larger stash when two players cross together', () => {
    expect(
      selectGameWinners(
        [
          { playerId: 'me', stash: 205 },
          { playerId: 'you', stash: 260 },
        ],
        200,
      ),
    ).toEqual(['you']);
  });

  it('names both when they cross together on the same stash', () => {
    expect(
      selectGameWinners(
        [
          { playerId: 'me', stash: 260 },
          { playerId: 'you', stash: 260 },
        ],
        200,
      ),
    ).toEqual(['me', 'you']);
  });
});

describe('hasRoundTimerExpired', () => {
  const opened = new Date('2026-09-19T12:00:00.000Z');

  it('is false before the deadline', () => {
    expect(hasRoundTimerExpired(opened, 60, new Date('2026-09-19T12:00:59.000Z'))).toBe(false);
  });

  it('is true on the deadline', () => {
    expect(hasRoundTimerExpired(opened, 60, new Date('2026-09-19T12:01:00.000Z'))).toBe(true);
  });

  it('is false for a game played without a timer', () => {
    expect(hasRoundTimerExpired(opened, null, new Date('2027-01-01T00:00:00.000Z'))).toBe(false);
  });

  it('is false while no round is open', () => {
    expect(hasRoundTimerExpired(null, 60, new Date('2027-01-01T00:00:00.000Z'))).toBe(false);
  });
});

describe('narrowGameStatus', () => {
  it('recognises each status the game stores', () => {
    expect(narrowGameStatus('lobby')).toBe('lobby');
    expect(narrowGameStatus('playing')).toBe('playing');
    expect(narrowGameStatus('finished')).toBe('finished');
  });

  it('falls back to the lobby for anything it does not recognise', () => {
    expect(narrowGameStatus('abandoned')).toBe('lobby');
  });
});

describe('assembleBidTable', () => {
  const roster = [
    { id: 'p1', stashBananas: 10 },
    { id: 'p2', stashBananas: 20 },
  ];

  it('builds one row per player once everybody has answered', () => {
    const answers = new Map([
      ['p1', 30],
      ['p2', 25],
    ]);
    expect(assembleBidTable(roster, answers)).toEqual([
      { playerId: 'p1', stashBefore: 10, bid: 30 },
      { playerId: 'p2', stashBefore: 20, bid: 25 },
    ]);
  });

  it('answers nothing while a player has not replied', () => {
    expect(assembleBidTable(roster, new Map([['p1', 30]]))).toBeNull();
  });

  it('answers an empty table for an empty roster', () => {
    expect(assembleBidTable([], new Map())).toEqual([]);
  });
});

describe('selectMissingBidders', () => {
  const roster = [
    { id: 'p1', stashBananas: 10 },
    { id: 'p2', stashBananas: 20 },
  ];

  it('names the players who have not answered', () => {
    const missing = selectMissingBidders(roster, new Map([['p1', 30]]));
    expect(missing.map((player) => player.id)).toEqual(['p2']);
  });

  it('names nobody once everybody has answered', () => {
    const answers = new Map([
      ['p1', 30],
      ['p2', 25],
    ]);
    expect(selectMissingBidders(roster, answers)).toEqual([]);
  });
});

describe('selectWinnersWhenFinished', () => {
  const standings = [
    { playerId: 'p1', stash: 210 },
    { playerId: 'p2', stash: 40 },
  ];

  it('names the winner once the game is over', () => {
    expect(selectWinnersWhenFinished('finished', standings, 200)).toEqual(['p1']);
  });

  it('names nobody while the game is still running', () => {
    expect(selectWinnersWhenFinished('playing', standings, 200)).toEqual([]);
  });

  it('names nobody while the game waits in the lobby', () => {
    expect(selectWinnersWhenFinished('lobby', standings, 200)).toEqual([]);
  });
});
