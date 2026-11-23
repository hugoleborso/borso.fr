import { describe, expect, it } from 'vitest';
import {
  canCloseRound,
  isBidAdjustedOnce,
  isRascalBetOnce,
  isEveryBidPlaced,
  selectCardCount,
  selectExpectedTricks,
  tallyTricks,
} from './round.core';
import { NO_BONUS } from './scoring.core';

const NO_DISCARD = { isKrakenPlayed: false, isWhiteWhaleDiscard: false };
const KRAKEN = { isKrakenPlayed: true, isWhiteWhaleDiscard: false };

const entry = (
  bid: number | null,
  tricks: number | null = null,
  bidAdjustment: -1 | 0 | 1 = 0,
  rascalBet: 0 | 10 | 20 = 0,
) => ({
  bid,
  bidAdjustment,
  rascalBet,
  isMissed: tricks !== null,
  tricks,
  bonuses: NO_BONUS,
});

const missedWithoutTricks = (bid: number) => ({ ...entry(bid), isMissed: true });

// @FollowsBlueprint test-pure-unit
describe('selectCardCount', () => {
  it('deals as many cards as the round number', () => {
    expect(selectCardCount(1, 4)).toBe(1);
    expect(selectCardCount(10, 7)).toBe(10);
  });

  it('repeats the largest even deal when the deck runs short for eight players', () => {
    expect(selectCardCount(8, 8)).toBe(8);
    expect(selectCardCount(9, 8)).toBe(8);
    expect(selectCardCount(10, 8)).toBe(8);
  });
});

describe('selectExpectedTricks', () => {
  it('expects one trick per card, minus each trick the kraken or the white whale discarded', () => {
    expect(selectExpectedTricks(5, NO_DISCARD)).toBe(5);
    expect(selectExpectedTricks(5, KRAKEN)).toBe(4);
    expect(selectExpectedTricks(5, { isKrakenPlayed: false, isWhiteWhaleDiscard: true })).toBe(4);
    expect(selectExpectedTricks(5, { isKrakenPlayed: true, isWhiteWhaleDiscard: true })).toBe(3);
  });
});

describe('tallyTricks', () => {
  it('waits while a bid or a missed count is unknown', () => {
    expect(tallyTricks([entry(1), entry(null)], 2, NO_DISCARD)).toEqual({ kind: 'incomplete' });
  });

  it('waits while a bid marked missed has no tricks yet, so the round cannot close', () => {
    const tally = tallyTricks([entry(1), missedWithoutTricks(1)], 2, NO_DISCARD);
    expect(tally).toEqual({ kind: 'incomplete' });
    expect(canCloseRound(tally)).toBe(false);
  });

  it('balances when every trick of the deal is accounted for', () => {
    expect(tallyTricks([entry(2), entry(1, 3)], 5, NO_DISCARD)).toEqual({
      kind: 'balanced',
      counted: 5,
    });
  });

  it('flags a count that does not match the deal', () => {
    expect(tallyTricks([entry(2), entry(1, 0)], 5, NO_DISCARD)).toEqual({
      kind: 'unbalanced',
      counted: 2,
      expected: 5,
    });
    expect(tallyTricks([entry(2), entry(2)], 5, KRAKEN)).toEqual({
      kind: 'balanced',
      counted: 4,
    });
  });
});

describe('the gates that close a phase', () => {
  it('closes the bids only once every player has one', () => {
    expect(isEveryBidPlaced([entry(0), entry(2)])).toBe(true);
    expect(isEveryBidPlaced([entry(0), entry(null)])).toBe(false);
  });

  it('lets one player at most use Harry the Giant in a round', () => {
    expect(isBidAdjustedOnce([entry(1, null, 1), entry(2)])).toBe(true);
    expect(isBidAdjustedOnce([entry(1, null, 1), entry(2, null, -1)])).toBe(false);
  });

  it('lets one player at most bet with Rascal of Roatan in a round', () => {
    expect(isRascalBetOnce([entry(1, null, 0, 20), entry(2)])).toBe(true);
    expect(isRascalBetOnce([entry(1, null, 0, 20), entry(2, null, 0, 10)])).toBe(false);
  });

  it('closes a round only when its tricks balance', () => {
    expect(canCloseRound({ kind: 'balanced', counted: 5 })).toBe(true);
    expect(canCloseRound({ kind: 'unbalanced', counted: 4, expected: 5 })).toBe(false);
    expect(canCloseRound({ kind: 'incomplete' })).toBe(false);
  });
});
