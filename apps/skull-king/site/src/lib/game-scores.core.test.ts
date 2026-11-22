import { NO_BONUS } from '@domain/scoring.core';
import { describe, expect, it } from 'vitest';
import {
  formatEntryDetail,
  formatPointsOrPending,
  selectBonusBadge,
  selectPointsTone,
  formatSignedPoints,
  selectLatestEntry,
  selectEntry,
  selectEntryPoints,
  selectLeaderIds,
  selectRound,
  selectScoredRounds,
  selectStandings,
  sumBids,
} from './game-scores.core';
import type { GameView } from './game-view.core';

function aGame(phase: GameView['phase']): GameView {
  return {
    joinCode: 'BRIG',
    phase,
    currentRound: 2,
    players: [
      { id: 'p1', seat: 0, name: 'Hugo', icon: 'skull', color: 'gold' },
      { id: 'p2', seat: 1, name: 'Léa', icon: 'parrot', color: 'lagoon' },
      { id: 'p3', seat: 2, name: 'Max', icon: 'anchor', color: 'coral' },
    ],
    rounds: [
      {
        number: 1,
        cardCount: 1,
        isKrakenPlayed: false,
        isWhiteWhaleDiscard: false,
        entries: [
          {
            playerId: 'p1',
            bid: 1,
            bidAdjustment: 0,
            rascalBet: 0,
            tricks: null,
            bonuses: NO_BONUS,
          },
          { playerId: 'p2', bid: 0, bidAdjustment: 0, rascalBet: 0, tricks: 1, bonuses: NO_BONUS },
          {
            playerId: 'p3',
            bid: 0,
            bidAdjustment: 0,
            rascalBet: 0,
            tricks: null,
            bonuses: NO_BONUS,
          },
        ],
      },
      {
        number: 2,
        cardCount: 2,
        isKrakenPlayed: false,
        isWhiteWhaleDiscard: false,
        entries: [
          {
            playerId: 'p1',
            bid: null,
            bidAdjustment: 0,
            rascalBet: 0,
            tricks: null,
            bonuses: NO_BONUS,
          },
          {
            playerId: 'p2',
            bid: 2,
            bidAdjustment: 0,
            rascalBet: 0,
            tricks: null,
            bonuses: { ...NO_BONUS, loot: 1 },
          },
          { playerId: 'p3', bid: 1, bidAdjustment: 0, rascalBet: 0, tricks: 0, bonuses: NO_BONUS },
        ],
      },
    ],
    readAt: '2026-11-22T10:00:00.000Z',
  };
}

// @FollowsBlueprint test-pure-unit
describe('selectScoredRounds', () => {
  it('leaves out the round still being bid', () => {
    expect(selectScoredRounds(aGame('bidding')).map((round) => round.number)).toEqual([1]);
  });

  it('includes the round being scored', () => {
    expect(selectScoredRounds(aGame('scoring')).map((round) => round.number)).toEqual([1, 2]);
  });

  it('includes the last round once the game is finished', () => {
    expect(selectScoredRounds(aGame('finished'))).toHaveLength(2);
  });
});

describe('selectEntry and selectEntryPoints', () => {
  const round = aGame('scoring').rounds[0];

  it('finds the entry of the player it names', () => {
    expect(round === undefined ? null : selectEntry(round, 'p2')?.tricks).toBe(1);
  });

  it('answers null for a player the round does not know', () => {
    expect(round === undefined ? 'missing' : selectEntry(round, 'p9')).toBeNull();
    expect(round === undefined ? 'missing' : selectEntryPoints(round, 'p9')).toBeNull();
  });

  it('scores the entry with the cards dealt in that round', () => {
    expect(round === undefined ? null : selectEntryPoints(round, 'p3')).toBe(10);
  });
});

describe('selectStandings', () => {
  it('ranks by total over the scored rounds, with the last round as the delta', () => {
    const standings = selectStandings(aGame('scoring'));
    expect(
      standings.map((standing) => [standing.player.id, standing.total, standing.lastDelta]),
    ).toEqual([
      ['p2', 50, 60],
      ['p1', 20, null],
      ['p3', 0, -10],
    ]);
  });

  it('breaks a tie by seat', () => {
    const game = aGame('bidding');
    const tied = { ...game, rounds: [] };
    expect(selectStandings(tied).map((standing) => standing.player.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('shows no delta before any round is scored', () => {
    const game = { ...aGame('bidding'), currentRound: 1 };
    expect(selectStandings(game).map((standing) => standing.lastDelta)).toEqual([null, null, null]);
  });
});

describe('selectLeaderIds', () => {
  it('names every player tied at the top', () => {
    const game = { ...aGame('bidding'), rounds: [] };
    expect(selectLeaderIds(selectStandings(game))).toEqual(['p1', 'p2', 'p3']);
  });

  it('names the one player ahead', () => {
    expect(selectLeaderIds(selectStandings(aGame('scoring')))).toEqual(['p2']);
  });

  it('names nobody when there is no standing', () => {
    expect(selectLeaderIds([])).toEqual([]);
  });
});

describe('sumBids', () => {
  it('adds the bids placed and counts a missing bid as nothing', () => {
    const round = aGame('bidding').rounds[1];
    expect(round === undefined ? null : sumBids(round)).toBe(3);
  });
});

describe('formatSignedPoints', () => {
  it('puts a plus sign before a gain', () => {
    expect(formatSignedPoints(40)).toBe('+40');
  });

  it('puts a minus sign before a loss', () => {
    expect(formatSignedPoints(-20)).toBe('−20');
  });

  it('writes zero bare', () => {
    expect(formatSignedPoints(0)).toBe('0');
  });
});

describe('selectBonusBadge', () => {
  it('shows nothing for no card', () => {
    expect(selectBonusBadge(0, 30)).toBeNull();
  });

  it('shows the points of one card', () => {
    expect(selectBonusBadge(1, 30)).toBe('+30');
  });

  it('shows the count times the points of several cards', () => {
    expect(selectBonusBadge(2, 30)).toBe('2\u00d730');
  });
});

describe('selectPointsTone', () => {
  it('reads unknown points as pending', () => {
    expect(selectPointsTone(null)).toBe('pending');
  });

  it('reads zero and more as a gain, less as a loss', () => {
    expect(selectPointsTone(0)).toBe('gain');
    expect(selectPointsTone(-10)).toBe('loss');
  });
});

describe('formatPointsOrPending', () => {
  it('writes the pending mark for unknown points', () => {
    expect(formatPointsOrPending(null, '?')).toBe('?');
  });

  it('writes signed points otherwise', () => {
    expect(formatPointsOrPending(-10, '?')).toBe('\u221210');
  });
});
describe('selectRound', () => {
  it('finds the round it names', () => {
    expect(selectRound(aGame('bidding'), 2)?.cardCount).toBe(2);
  });

  it('answers null for a round not opened yet', () => {
    expect(selectRound(aGame('bidding'), 3)).toBeNull();
  });
});

describe('formatEntryDetail', () => {
  it('writes the bid over the tricks taken, a made bid counting as its own tricks', () => {
    expect(
      formatEntryDetail({
        playerId: 'p1',
        bid: 2,
        bidAdjustment: 0,
        rascalBet: 0,
        tricks: null,
        bonuses: NO_BONUS,
      }),
    ).toBe('2/2');
    expect(
      formatEntryDetail({
        playerId: 'p1',
        bid: 2,
        bidAdjustment: 0,
        rascalBet: 0,
        tricks: 0,
        bonuses: NO_BONUS,
      }),
    ).toBe('2/0');
  });

  it('writes a dash for what is missing', () => {
    expect(
      formatEntryDetail({
        playerId: 'p1',
        bid: null,
        bidAdjustment: 0,
        rascalBet: 0,
        tricks: null,
        bonuses: NO_BONUS,
      }),
    ).toBe('\u2013/\u2013');
    expect(formatEntryDetail(null)).toBe('\u2013/\u2013');
  });
});

describe('selectLatestEntry', () => {
  it('reads the entry of the round and player named from the cached game', () => {
    expect(selectLatestEntry(aGame('scoring'), 2, 'p2')?.bonuses.loot).toBe(1);
  });

  it('answers null when nothing is cached or the round is not opened', () => {
    expect(selectLatestEntry(undefined, 1, 'p1')).toBeNull();
    expect(selectLatestEntry(aGame('scoring'), 3, 'p1')).toBeNull();
  });
});
