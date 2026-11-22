import { describe, expect, it } from 'vitest';
import { NO_BONUS } from '@domain/scoring.core';
import {
  type PlayedRound,
  refuseEntryWrite,
  refusePhaseMove,
  refuseRoundWrite,
  selectSeatHolding,
  selectAbilityHolders,
  selectEntryChanges,
} from './game-write.core';

const SEATED = ['p1', 'p2', 'p3', 'p4'];

const facts = (overrides: Partial<Parameters<typeof refuseEntryWrite>[0]> = {}) => ({
  roundNumber: 3,
  currentRound: 3,
  seatedPlayerIds: SEATED,
  playerId: 'p2',
  bid: undefined,
  bidAdjustment: undefined,
  rascalBet: undefined,
  tricks: undefined,
  holders: { adjusted: [], betting: [] },
  ...overrides,
});

// @FollowsBlueprint test-pure-unit
describe('refuseRoundWrite', () => {
  it('accepts the current round and any round before it', () => {
    expect(refuseRoundWrite(3, 3)).toBeNull();
    expect(refuseRoundWrite(1, 3)).toBeNull();
  });

  it('refuses a round the table has not reached yet', () => {
    expect(refuseRoundWrite(4, 3)).toBe('round-not-played');
  });
});

describe('refuseEntryWrite', () => {
  it('accepts a bid and tricks up to the cards dealt', () => {
    expect(refuseEntryWrite(facts({ bid: 3, tricks: 0 }))).toBeNull();
  });

  it('accepts a cleared bid and cleared tricks', () => {
    expect(refuseEntryWrite(facts({ bid: null, tricks: null }))).toBeNull();
  });

  it('refuses a round the table has not reached yet before anything else', () => {
    expect(refuseEntryWrite(facts({ roundNumber: 4, playerId: 'stranger', bid: 9 }))).toBe(
      'round-not-played',
    );
  });

  it('refuses a player who is not seated at the game', () => {
    expect(refuseEntryWrite(facts({ playerId: 'stranger' }))).toBe('player-not-found');
  });

  it('refuses a bid above the cards dealt this round', () => {
    expect(refuseEntryWrite(facts({ bid: 4 }))).toBe('value-out-of-range');
  });

  it('refuses tricks above the cards dealt this round', () => {
    expect(refuseEntryWrite(facts({ tricks: 4 }))).toBe('value-out-of-range');
  });

  it('reads the cards dealt from the number of players', () => {
    const eight = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const tenthRound = { roundNumber: 10, currentRound: 10, seatedPlayerIds: eight };
    expect(refuseEntryWrite(facts({ ...tenthRound, bid: 8 }))).toBeNull();
    expect(refuseEntryWrite(facts({ ...tenthRound, bid: 9 }))).toBe('value-out-of-range');
  });
});

describe('the one Harry the Giant of a round', () => {
  it('lets one player move their bid', () => {
    expect(refuseEntryWrite(facts({ bidAdjustment: -1 }))).toBeNull();
    expect(
      refuseEntryWrite(facts({ bidAdjustment: 1, holders: { adjusted: ['p2'], betting: [] } })),
    ).toBeNull();
  });

  it('refuses a second player moving their bid in the same round', () => {
    expect(
      refuseEntryWrite(facts({ bidAdjustment: 1, holders: { adjusted: ['p1'], betting: [] } })),
    ).toBe('value-out-of-range');
  });

  it('always lets an adjustment be taken back', () => {
    expect(
      refuseEntryWrite(facts({ bidAdjustment: 0, holders: { adjusted: ['p1'], betting: [] } })),
    ).toBeNull();
    expect(
      refuseEntryWrite(facts({ bidAdjustment: null, holders: { adjusted: ['p1'], betting: [] } })),
    ).toBeNull();
  });

  it('reads who moved their bid and who bet in one round', () => {
    const roundEntries = [
      { roundNumber: 3, playerId: 'p1', bidAdjustment: 1, rascalBet: 0 },
      { roundNumber: 3, playerId: 'p2', bidAdjustment: 0, rascalBet: 20 },
      { roundNumber: 3, playerId: 'p3', bidAdjustment: null, rascalBet: null },
      { roundNumber: 2, playerId: 'p4', bidAdjustment: -1, rascalBet: 10 },
    ];
    expect(selectAbilityHolders(roundEntries, 3)).toEqual({ adjusted: ['p1'], betting: ['p2'] });
  });
});

describe('the one Rascal of Roatan bet of a round', () => {
  it('lets one player bet, and the same player change the bet', () => {
    expect(refuseEntryWrite(facts({ rascalBet: 20 }))).toBeNull();
    expect(
      refuseEntryWrite(facts({ rascalBet: 10, holders: { adjusted: [], betting: ['p2'] } })),
    ).toBeNull();
  });

  it('refuses a second player betting in the same round', () => {
    expect(
      refuseEntryWrite(facts({ rascalBet: 10, holders: { adjusted: [], betting: ['p1'] } })),
    ).toBe('value-out-of-range');
  });

  it('always lets a bet be taken back', () => {
    expect(
      refuseEntryWrite(facts({ rascalBet: null, holders: { adjusted: [], betting: ['p1'] } })),
    ).toBeNull();
  });
});

describe('selectEntryChanges', () => {
  it('changes nothing for an empty write', () => {
    expect(selectEntryChanges({})).toStrictEqual({});
  });

  it('keeps each value given, and a null that clears it', () => {
    expect(selectEntryChanges({ bid: 2, tricks: null })).toStrictEqual({ bid: 2, tricks: null });
  });

  it('changes only the bonus kinds given', () => {
    expect(selectEntryChanges({ bonuses: { loot: 1 } })).toStrictEqual({ loot: 1 });
  });

  it('resets a cleared bet to none', () => {
    expect(selectEntryChanges({ rascalBet: null })).toStrictEqual({ rascalBet: 0 });
    expect(selectEntryChanges({ rascalBet: 20 })).toStrictEqual({ rascalBet: 20 });
  });

  it('resets a cleared adjustment to none', () => {
    expect(selectEntryChanges({ bidAdjustment: null })).toStrictEqual({ bidAdjustment: 0 });
    expect(selectEntryChanges({ bidAdjustment: -1 })).toStrictEqual({ bidAdjustment: -1 });
  });

  it('resets every bonus kind when the bonuses are cleared', () => {
    expect(selectEntryChanges({ bonuses: null })).toStrictEqual(NO_BONUS);
  });
});

const made = (bid: number | null, tricks: number | null = null) => ({
  bid,
  bidAdjustment: 0 as const,
  rascalBet: 0 as const,
  tricks,
  bonuses: NO_BONUS,
});

const round = (number: number, entries: PlayedRound['entries'], discards = {}): PlayedRound => ({
  number,
  cardCount: number,
  isKrakenPlayed: false,
  isWhiteWhaleDiscard: false,
  entries,
  ...discards,
});

const BALANCED_FIRST = round(1, [made(1), made(0)]);
const UNBALANCED_SECOND = round(2, [made(1), made(0)]);

describe('refusePhaseMove', () => {
  it('lets a phone press play again on the state it already shows', () => {
    expect(
      refusePhaseMove({
        current: { round: 2, phase: 'scoring' },
        target: { round: 2, phase: 'scoring' },
        rounds: [BALANCED_FIRST, round(2, [made(null), made(null)])],
      }),
    ).toBeNull();
  });

  it('refuses to score a round while a bid is missing', () => {
    expect(
      refusePhaseMove({
        current: { round: 1, phase: 'bidding' },
        target: { round: 1, phase: 'scoring' },
        rounds: [round(1, [made(1), made(null)])],
      }),
    ).toBe('bids-missing');
  });

  it('refuses to score a round nobody has bid on yet', () => {
    expect(
      refusePhaseMove({
        current: { round: 1, phase: 'scoring' },
        target: { round: 2, phase: 'scoring' },
        rounds: [BALANCED_FIRST],
      }),
    ).toBe('bids-missing');
  });

  it('scores a round once every bid is placed', () => {
    expect(
      refusePhaseMove({
        current: { round: 1, phase: 'bidding' },
        target: { round: 1, phase: 'scoring' },
        rounds: [BALANCED_FIRST],
      }),
    ).toBeNull();
  });

  it('refuses the next round while any played round does not balance', () => {
    expect(
      refusePhaseMove({
        current: { round: 2, phase: 'scoring' },
        target: { round: 3, phase: 'bidding' },
        rounds: [BALANCED_FIRST, UNBALANCED_SECOND],
      }),
    ).toBe('tricks-unbalanced');
  });

  it('refuses to finish while a played round does not balance', () => {
    const rounds = [BALANCED_FIRST, round(10, [made(5), made(4)])];
    expect(
      refusePhaseMove({
        current: { round: 10, phase: 'scoring' },
        target: { round: 10, phase: 'finished' },
        rounds,
      }),
    ).toBe('tricks-unbalanced');
  });

  it('moves on once the discards bring every round into balance', () => {
    expect(
      refusePhaseMove({
        current: { round: 2, phase: 'scoring' },
        target: { round: 3, phase: 'bidding' },
        rounds: [BALANCED_FIRST, round(2, [made(1), made(0)], { isWhiteWhaleDiscard: true })],
      }),
    ).toBeNull();
  });

  it('always lets the table go back to an earlier step', () => {
    const rounds = [BALANCED_FIRST, round(2, [made(null), made(0, 5)])];
    expect(
      refusePhaseMove({
        current: { round: 2, phase: 'scoring' },
        target: { round: 2, phase: 'bidding' },
        rounds,
      }),
    ).toBeNull();
    expect(
      refusePhaseMove({
        current: { round: 2, phase: 'scoring' },
        target: { round: 1, phase: 'bidding' },
        rounds,
      }),
    ).toBeNull();
  });
});

describe('selectSeatHolding', () => {
  const seats = [
    { id: 'p1', accountId: null },
    { id: 'p2', accountId: 'me' },
  ];

  it('reads a seat the account already holds as mine', () => {
    expect(selectSeatHolding(seats, 'p2', 'me')).toBe('mine');
  });

  it('reads a seat another account holds as taken', () => {
    expect(selectSeatHolding(seats, 'p2', 'someone-else')).toBe('seat-taken');
  });

  it('reads a seat nobody holds as free', () => {
    expect(selectSeatHolding(seats, 'p1', 'me')).toBe('free');
  });

  it('reads a seat that is not at the table as missing', () => {
    expect(selectSeatHolding(seats, 'p9', 'me')).toBe('player-not-found');
  });
});
