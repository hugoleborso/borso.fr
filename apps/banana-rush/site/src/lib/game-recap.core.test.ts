import { describe, expect, it } from 'vitest';
import type { BroadcastPlayer, BroadcastRound } from './game-broadcast.core';
import {
  buildRecapRounds,
  clampPageIndex,
  isNextStepBlocked,
  isPreviousStepBlocked,
  selectPage,
} from './game-recap.core';

function outcome(playerId: string, overrides: Record<string, number | boolean> = {}) {
  return {
    playerId,
    bid: 10,
    stashBefore: 10,
    stashAfter: 10,
    crateWon: 0,
    tariffPaid: 0,
    tariffReceived: 0,
    busted: false,
    ...overrides,
  };
}

const players: readonly BroadcastPlayer[] = [
  { id: 'p1', nickname: 'Hugo', avatar: 'chimp', stashBananas: 15, isHost: true, hasBid: false },
  { id: 'p2', nickname: 'Zoe', avatar: 'lemur', stashBananas: 5, isHost: false, hasBid: false },
];

const rounds: readonly BroadcastRound[] = [
  {
    roundNumber: 1,
    crateBefore: 10,
    crateAfter: 15,
    outcomes: [outcome('p1', { crateWon: 10, tariffPaid: 5, stashAfter: 15 }), outcome('p2')],
  },
  {
    roundNumber: 2,
    crateBefore: 15,
    crateAfter: 20,
    outcomes: [outcome('p1'), outcome('p2', { crateWon: 15, stashAfter: 25 })],
  },
];

// @FollowsBlueprint test-pure-unit
describe('buildRecapRounds', () => {
  it('makes one page per round, in the order they were played', () => {
    expect(buildRecapRounds(rounds, players).map((page) => page.roundNumber)).toEqual([1, 2]);
  });

  it('carries what the crate was worth before and after each round', () => {
    expect(
      buildRecapRounds(rounds, players).map((page) => [page.crateBefore, page.crateAfter]),
    ).toEqual([
      [10, 15],
      [15, 20],
    ]);
  });

  it('tells every player story of a round, with their name and their bid', () => {
    const firstPage = buildRecapRounds(rounds, players)[0];
    expect(firstPage?.stories.map((story) => [story.nickname, story.bid])).toEqual([
      ['Hugo', 10],
      ['Zoe', 10],
    ]);
  });

  it('marks the player who took the crate in that round', () => {
    expect(buildRecapRounds(rounds, players)[1]?.stories.map((story) => story.wonTheCrate)).toEqual(
      [false, true],
    );
  });

  it('leaves out a story whose player is no longer at the table', () => {
    const orphaned: readonly BroadcastRound[] = [
      { roundNumber: 1, crateBefore: 10, crateAfter: 15, outcomes: [outcome('ghost')] },
    ];
    expect(buildRecapRounds(orphaned, players)[0]?.stories).toEqual([]);
  });

  it('makes no page at all for a game that resolved nothing', () => {
    expect(buildRecapRounds([], players)).toEqual([]);
  });
});

describe('clampPageIndex', () => {
  it('leaves a position inside the range alone', () => {
    expect(clampPageIndex(2, 5)).toBe(2);
  });

  it('pulls a position past the end back to the last page', () => {
    expect(clampPageIndex(9, 5)).toBe(4);
  });

  it('pulls a position before the start back to the first page', () => {
    expect(clampPageIndex(-3, 5)).toBe(0);
  });

  it('answers the first page for a history with nothing in it', () => {
    expect(clampPageIndex(0, 0)).toBe(0);
  });
});

describe('selectPage', () => {
  it('reads the page asked for', () => {
    expect(selectPage(buildRecapRounds(rounds, players), 1)?.roundNumber).toBe(2);
  });

  it('reads the last page rather than nothing when asked past the end', () => {
    expect(selectPage(buildRecapRounds(rounds, players), 7)?.roundNumber).toBe(2);
  });

  it('reads nothing at all from an empty history', () => {
    expect(selectPage([], 0)).toBeUndefined();
  });
});

describe('isPreviousStepBlocked', () => {
  it('blocks a step back from the opening page', () => {
    expect(isPreviousStepBlocked(0)).toBe(true);
  });

  it('allows a step back from any page after it', () => {
    expect(isPreviousStepBlocked(1)).toBe(false);
  });
});

describe('isNextStepBlocked', () => {
  it('blocks a step forward from the closing page', () => {
    expect(isNextStepBlocked(4, 5)).toBe(true);
  });

  it('allows a step forward from any page before it', () => {
    expect(isNextStepBlocked(0, 5)).toBe(false);
  });

  it('blocks both directions on a history with nothing in it', () => {
    expect(isNextStepBlocked(0, 0)).toBe(true);
    expect(isPreviousStepBlocked(0)).toBe(true);
  });
});
