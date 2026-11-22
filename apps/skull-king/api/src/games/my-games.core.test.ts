import { describe, expect, it } from 'vitest';
import { NO_BONUS } from '@domain/scoring.core';
import { buildMyGames, type MyGameFacts, selectMyRank, selectWinnerSeats } from './my-games.core';

const MY_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const OPENED_AT = new Date('2026-11-22T20:00:00.000Z');

const entry = (
  roundNumber: number,
  playerId: string,
  bid: number | null,
  tricks: number | null = null,
) => ({
  roundNumber,
  playerId,
  bid,
  bidAdjustment: null,
  rascalBet: null,
  tricks,
  ...NO_BONUS,
});

const game = (overrides: Partial<MyGameFacts> = {}): MyGameFacts => ({
  joinCode: 'BRIG',
  phase: 'bidding',
  currentRound: 2,
  openedAt: OPENED_AT,
  players: [
    { id: 'lea', seat: 1, icon: 'parrot', color: 'lagoon', accountId: null },
    { id: 'hugo', seat: 0, icon: 'skull', color: 'gold', accountId: MY_ACCOUNT_ID },
  ],
  entries: [],
  ...overrides,
});

// @FollowsBlueprint test-pure-unit
describe('selectMyRank', () => {
  it('has no rank for an account that claimed no seat', () => {
    expect(selectMyRank(game(), 'someone-else')).toBeNull();
  });

  it('ranks the claimed seat by the derived score', () => {
    const behind = game({ entries: [entry(1, 'hugo', 1, 0), entry(1, 'lea', 0)] });
    expect(selectMyRank(behind, MY_ACCOUNT_ID)).toBe(2);
  });

  it('shares the first rank on a tie and counts unscored entries as no points', () => {
    const tied = game({
      entries: [entry(1, 'hugo', 1), entry(1, 'lea', 1), entry(2, 'hugo', null)],
    });
    expect(selectMyRank(tied, MY_ACCOUNT_ID)).toBe(1);
  });

  it('scores a bid Harry the Giant moved', () => {
    const moved = game({
      entries: [{ ...entry(1, 'hugo', 0, 1), bidAdjustment: 1 }, entry(1, 'lea', 0, 1)],
    });
    expect(selectMyRank(moved, MY_ACCOUNT_ID)).toBe(1);
  });

  it('scores a Rascal of Roatan bet', () => {
    const betAndLost = game({
      entries: [{ ...entry(1, 'hugo', 1), rascalBet: 20 }, entry(1, 'lea', 1, 0)],
    });
    expect(selectMyRank(betAndLost, MY_ACCOUNT_ID)).toBe(1);
  });

  it('leaves out a round the game has moved back from', () => {
    const movedBack = game({ currentRound: 1, entries: [entry(2, 'lea', 2)] });
    expect(selectMyRank(movedBack, MY_ACCOUNT_ID)).toBe(1);
  });
});

describe('selectWinnerSeats', () => {
  it('names no winner before the game is finished', () => {
    expect(selectWinnerSeats(game({ entries: [entry(1, 'lea', 1)] }))).toEqual([]);
  });

  it('names the seat with the best total once the game is finished', () => {
    const finished = game({
      phase: 'finished',
      entries: [entry(1, 'lea', 1), entry(1, 'hugo', 1, 0)],
    });
    expect(selectWinnerSeats(finished)).toEqual([1]);
  });

  it('names every seat tied for the best total, in seat order', () => {
    const tied = game({ phase: 'finished', entries: [entry(1, 'lea', 1), entry(1, 'hugo', 1)] });
    expect(selectWinnerSeats(tied)).toEqual([0, 1]);
  });

  it('names no winner for a table with nobody seated', () => {
    expect(selectWinnerSeats(game({ phase: 'finished', players: [] }))).toEqual([]);
  });
});

describe('buildMyGames', () => {
  it('keeps the order it was given and lists the marks in seat order', () => {
    const second = game({ joinCode: 'KRAK' });
    expect(buildMyGames([game(), second], MY_ACCOUNT_ID)).toEqual([
      {
        joinCode: 'BRIG',
        phase: 'bidding',
        currentRound: 2,
        openedAt: '2026-11-22T20:00:00.000Z',
        players: [
          { seat: 0, icon: 'skull', color: 'gold', accountId: MY_ACCOUNT_ID },
          { seat: 1, icon: 'parrot', color: 'lagoon', accountId: null },
        ],
        myRank: 1,
        winnerSeats: [],
      },
      expect.objectContaining({ joinCode: 'KRAK' }),
    ]);
  });
});
