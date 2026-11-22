import { describe, expect, it } from 'vitest';
import { NO_BONUS } from '@domain/scoring.core';
import {
  type PlayedRound,
  refuseEntryWrite,
  refusePhaseMove,
  refuseRoundWrite,
  type RoundEntryFacts,
  decideSeatClaim,
  seatTable,
  selectEntryChanges,
} from './game-write.core';

const SEATED = ['p1', 'p2', 'p3', 'p4'];

const entryOf = (
  playerId: string,
  abilities: Partial<Pick<RoundEntryFacts, 'bidAdjustment' | 'rascalBet'>> = {},
): RoundEntryFacts => ({
  playerId,
  bid: null,
  bidAdjustment: 0,
  rascalBet: 0,
  isMissed: false,
  tricks: null,
  bonuses: NO_BONUS,
  ...abilities,
});

const UNTOUCHED_ROUND = SEATED.map((playerId) => entryOf(playerId));

const facts = (overrides: Partial<Parameters<typeof refuseEntryWrite>[0]> = {}) => ({
  roundNumber: 3,
  currentRound: 3,
  seatedPlayerIds: SEATED,
  playerId: 'p2',
  changes: {},
  roundEntries: UNTOUCHED_ROUND,
  ...overrides,
});

const roundWith = (holder: string, abilities: Parameters<typeof entryOf>[1]) =>
  SEATED.map((playerId) => entryOf(playerId, playerId === holder ? abilities : {}));

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
    expect(refuseEntryWrite(facts({ changes: { bid: 3, tricks: 0 } }))).toBeNull();
  });

  it('accepts a cleared bid and cleared tricks', () => {
    expect(refuseEntryWrite(facts({ changes: { bid: null, tricks: null } }))).toBeNull();
  });

  it('refuses a round the table has not reached yet before anything else', () => {
    expect(
      refuseEntryWrite(facts({ roundNumber: 4, playerId: 'stranger', changes: { bid: 9 } })),
    ).toBe('round-not-played');
  });

  it('refuses a player who is not seated at the game', () => {
    expect(refuseEntryWrite(facts({ playerId: 'stranger' }))).toBe('player-not-found');
  });

  it('refuses a bid above the cards dealt this round', () => {
    expect(refuseEntryWrite(facts({ changes: { bid: 4 } }))).toBe('value-out-of-range');
  });

  it('refuses tricks above the cards dealt this round', () => {
    expect(refuseEntryWrite(facts({ changes: { tricks: 4 } }))).toBe('value-out-of-range');
  });

  it('reads the cards dealt from the number of players', () => {
    const eight = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const tenthRound = { roundNumber: 10, currentRound: 10, seatedPlayerIds: eight };
    expect(refuseEntryWrite(facts({ ...tenthRound, changes: { bid: 8 } }))).toBeNull();
    expect(refuseEntryWrite(facts({ ...tenthRound, changes: { bid: 9 } }))).toBe(
      'value-out-of-range',
    );
  });
});

describe('the one Harry the Giant of a round', () => {
  it('lets one player move their bid, and move it again', () => {
    expect(refuseEntryWrite(facts({ changes: { bidAdjustment: -1 } }))).toBeNull();
    expect(
      refuseEntryWrite(
        facts({
          changes: { bidAdjustment: 1 },
          roundEntries: roundWith('p2', { bidAdjustment: -1 }),
        }),
      ),
    ).toBeNull();
  });

  it('refuses a second player moving their bid in the same round', () => {
    expect(
      refuseEntryWrite(
        facts({
          changes: { bidAdjustment: 1 },
          roundEntries: roundWith('p1', { bidAdjustment: -1 }),
        }),
      ),
    ).toBe('value-out-of-range');
  });

  it('lets another player write anything else while one player holds Harry', () => {
    expect(
      refuseEntryWrite(
        facts({ changes: { bid: 2 }, roundEntries: roundWith('p1', { bidAdjustment: 1 }) }),
      ),
    ).toBeNull();
  });

  it('always lets an adjustment be taken back', () => {
    expect(
      refuseEntryWrite(
        facts({
          playerId: 'p1',
          changes: { bidAdjustment: 0 },
          roundEntries: roundWith('p1', { bidAdjustment: 1 }),
        }),
      ),
    ).toBeNull();
  });
});

describe('the one Rascal of Roatan bet of a round', () => {
  it('lets one player bet, and the same player change the bet', () => {
    expect(refuseEntryWrite(facts({ changes: { rascalBet: 20 } }))).toBeNull();
    expect(
      refuseEntryWrite(
        facts({ changes: { rascalBet: 10 }, roundEntries: roundWith('p2', { rascalBet: 20 }) }),
      ),
    ).toBeNull();
  });

  it('refuses a second player betting in the same round', () => {
    expect(
      refuseEntryWrite(
        facts({ changes: { rascalBet: 10 }, roundEntries: roundWith('p1', { rascalBet: 20 }) }),
      ),
    ).toBe('value-out-of-range');
  });

  it('lets another player write anything else while one player bets', () => {
    expect(
      refuseEntryWrite(
        facts({ changes: { tricks: 1 }, roundEntries: roundWith('p1', { rascalBet: 10 }) }),
      ),
    ).toBeNull();
  });

  it('always lets a bet be taken back', () => {
    expect(
      refuseEntryWrite(
        facts({
          playerId: 'p1',
          changes: { rascalBet: 0 },
          roundEntries: roundWith('p1', { rascalBet: 10 }),
        }),
      ),
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

  it('keeps a missed or made mark when one is given', () => {
    expect(selectEntryChanges({ isMissed: true })).toStrictEqual({ isMissed: true });
    expect(selectEntryChanges({ isMissed: false, tricks: null })).toStrictEqual({
      isMissed: false,
      tricks: null,
    });
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
  isMissed: tricks !== null,
  tricks,
  bonuses: NO_BONUS,
});

const missedWithoutTricks = (bid: number) => ({ ...made(bid), isMissed: true });

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

const BALANCED_SECOND = round(2, [made(2), made(0)]);
const EVERY_ROUND_BALANCED = Array.from({ length: 10 }, (_, index) =>
  round(index + 1, [made(index + 1), made(0)]),
);

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

  it('scores a round once its own bids are placed, whatever an earlier round holds', () => {
    expect(
      refusePhaseMove({
        current: { round: 2, phase: 'bidding' },
        target: { round: 2, phase: 'scoring' },
        rounds: [round(1, [made(null), made(1)]), BALANCED_SECOND],
      }),
    ).toBeNull();
  });

  it('refuses to score the round played while one of its own bids is missing, after a complete one', () => {
    expect(
      refusePhaseMove({
        current: { round: 2, phase: 'bidding' },
        target: { round: 2, phase: 'scoring' },
        rounds: [BALANCED_FIRST, round(2, [made(1), made(null)])],
      }),
    ).toBe('bids-missing');
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

  it('refuses the next round while a bid marked missed has no tricks yet', () => {
    expect(
      refusePhaseMove({
        current: { round: 2, phase: 'scoring' },
        target: { round: 3, phase: 'bidding' },
        rounds: [BALANCED_FIRST, round(2, [made(2), missedWithoutTricks(0)])],
      }),
    ).toBe('tricks-unbalanced');
  });

  it('opens the next round once every played round balances', () => {
    expect(
      refusePhaseMove({
        current: { round: 2, phase: 'scoring' },
        target: { round: 3, phase: 'bidding' },
        rounds: [BALANCED_FIRST, BALANCED_SECOND],
      }),
    ).toBeNull();
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

  it('lets the table go back to the bids of the round it plays, balanced or not', () => {
    expect(
      refusePhaseMove({
        current: { round: 2, phase: 'scoring' },
        target: { round: 2, phase: 'bidding' },
        rounds: [BALANCED_FIRST, round(2, [made(null), made(0, 5)])],
      }),
    ).toBeNull();
  });

  it('refuses any other round than the one played and the next one', () => {
    const rounds = [BALANCED_FIRST, BALANCED_SECOND];
    const from = { round: 2, phase: 'scoring' } as const;
    expect(refusePhaseMove({ current: from, target: { round: 1, phase: 'bidding' }, rounds })).toBe(
      'value-out-of-range',
    );
    expect(refusePhaseMove({ current: from, target: { round: 4, phase: 'bidding' }, rounds })).toBe(
      'value-out-of-range',
    );
  });

  it('opens the next round only on its bids', () => {
    expect(
      refusePhaseMove({
        current: { round: 2, phase: 'scoring' },
        target: { round: 3, phase: 'scoring' },
        rounds: [BALANCED_FIRST, BALANCED_SECOND],
      }),
    ).toBe('value-out-of-range');
  });

  it('finishes the game from the scores of the last round', () => {
    expect(
      refusePhaseMove({
        current: { round: 10, phase: 'scoring' },
        target: { round: 10, phase: 'finished' },
        rounds: EVERY_ROUND_BALANCED,
      }),
    ).toBeNull();
  });

  it('refuses to finish from an earlier round, from the bids of the last one, or onto another round', () => {
    const finished = { round: 10, phase: 'finished' } as const;
    const rounds = EVERY_ROUND_BALANCED;
    expect(
      refusePhaseMove({ current: { round: 9, phase: 'scoring' }, target: finished, rounds }),
    ).toBe('value-out-of-range');
    expect(
      refusePhaseMove({
        current: { round: 9, phase: 'scoring' },
        target: { round: 9, phase: 'finished' },
        rounds,
      }),
    ).toBe('value-out-of-range');
    expect(
      refusePhaseMove({ current: { round: 10, phase: 'bidding' }, target: finished, rounds }),
    ).toBe('value-out-of-range');
    expect(
      refusePhaseMove({
        current: { round: 10, phase: 'scoring' },
        target: { round: 9, phase: 'finished' },
        rounds,
      }),
    ).toBe('value-out-of-range');
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

  it('lets a finished table go back to the scores of the last round', () => {
    expect(
      refusePhaseMove({
        current: { round: 10, phase: 'finished' },
        target: { round: 10, phase: 'scoring' },
        rounds: EVERY_ROUND_BALANCED,
      }),
    ).toBeNull();
  });
});

describe('decideSeatClaim', () => {
  const seats = [
    { id: 'p1', accountId: null },
    { id: 'p2', accountId: 'me' },
  ];

  it('keeps a seat the account already holds, without writing it again', () => {
    expect(decideSeatClaim(seats, 'p2', 'me')).toStrictEqual({ refusal: null, isLinking: false });
  });

  it('refuses a seat another account holds', () => {
    expect(decideSeatClaim(seats, 'p2', 'someone-else')).toStrictEqual({
      refusal: 'seat-taken',
      isLinking: false,
    });
  });

  it('links a seat nobody holds', () => {
    expect(decideSeatClaim(seats, 'p1', 'me')).toStrictEqual({ refusal: null, isLinking: true });
  });

  it('refuses a seat that is not at the table', () => {
    expect(decideSeatClaim(seats, 'p9', 'me')).toStrictEqual({
      refusal: 'player-not-found',
      isLinking: false,
    });
  });
});

describe('seatTable', () => {
  const ACCOUNT = 'account-1';
  const anna = { name: 'Anna', icon: 'skull', color: 'gold' } as const;
  const bob = { name: 'Bob', icon: 'parrot', color: 'lagoon' } as const;

  it('seats the players in the order sent, from seat 0, with their marks', () => {
    expect(seatTable([anna, bob], null)).toStrictEqual([
      { seat: 0, name: 'Anna', icon: 'skull', color: 'gold', accountId: null },
      { seat: 1, name: 'Bob', icon: 'parrot', color: 'lagoon', accountId: null },
    ]);
  });

  it('links the seat marked as the creator to the signed-in account, and no other', () => {
    const seats = seatTable(
      [
        { ...anna, isMe: true },
        { ...bob, isMe: false },
      ],
      ACCOUNT,
    );
    expect(seats.map((seat) => seat.accountId)).toStrictEqual([ACCOUNT, null]);
  });

  it('links nothing for a guest, even on the seat marked as the creator', () => {
    const seats = seatTable([{ ...anna, isMe: true }, bob], null);
    expect(seats.map((seat) => seat.accountId)).toStrictEqual([null, null]);
  });
});
