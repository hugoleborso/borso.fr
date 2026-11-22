import { MAXIMUM_BONUS_COUNT, NO_BONUS } from '@domain/scoring.core';
import { describe, expect, it } from 'vitest';
import {
  applyEntryEdit,
  applyGameEdit,
  applyRoundEdit,
  applyPhaseEdit,
  applyPlayerEdit,
  applySeatClaim,
  cycleBonus,
  cycleRascalBet,
  selectNextBidAdjustment,
} from './game-edits.core';
import type { GameView } from './game-view.core';

const READ_AT = '2026-11-22T10:00:00.000Z';

function aGame(): GameView {
  return {
    joinCode: 'BRIG',
    phase: 'bidding',
    currentRound: 2,
    players: [
      { id: 'p1', seat: 0, name: 'Hugo', icon: 'skull', color: 'gold' },
      { id: 'p2', seat: 1, name: 'Léa', icon: 'parrot', color: 'lagoon' },
    ],
    rounds: [1, 2].map((number) => ({
      number,
      cardCount: number,
      isKrakenPlayed: false,
      isWhiteWhaleDiscard: false,
      entries: [
        { playerId: 'p1', bid: 1, bidAdjustment: 0, rascalBet: 0, tricks: null, bonuses: NO_BONUS },
        { playerId: 'p2', bid: 0, bidAdjustment: 0, rascalBet: 0, tricks: 1, bonuses: NO_BONUS },
      ],
    })),
    revision: 4,
    readAt: READ_AT,
  };
}

// @FollowsBlueprint test-pure-unit
describe('applyEntryEdit', () => {
  it('changes only the fields the edit names, on the one entry it names', () => {
    const edited = applyEntryEdit(aGame(), 2, 'p1', { bid: 2 });
    expect(edited.rounds[1]?.entries[0]).toEqual({
      playerId: 'p1',
      bid: 2,
      bidAdjustment: 0,
      rascalBet: 0,
      tricks: null,
      bonuses: NO_BONUS,
    });
    expect(edited.rounds[1]?.entries[1]).toEqual(aGame().rounds[1]?.entries[1]);
    expect(edited.rounds[0]).toEqual(aGame().rounds[0]);
  });

  it('clears a field the edit sets to null', () => {
    const edited = applyEntryEdit(aGame(), 1, 'p2', { tricks: null, bid: null });
    expect(edited.rounds[0]?.entries[1]?.tricks).toBeNull();
    expect(edited.rounds[0]?.entries[1]?.bid).toBeNull();
  });

  it('replaces the bonuses the edit carries', () => {
    const bonuses = { ...NO_BONUS, loot: 1 };
    const edited = applyEntryEdit(aGame(), 1, 'p1', { bonuses });
    expect(edited.rounds[0]?.entries[0]?.bonuses).toEqual(bonuses);
    expect(edited.rounds[0]?.entries[0]?.bid).toBe(1);
  });

  it('keeps the readAt of the cached view', () => {
    expect(applyEntryEdit(aGame(), 1, 'p1', { bid: 0 }).readAt).toBe(READ_AT);
  });
});

describe('applyRoundEdit', () => {
  it('marks the kraken on the round it names only', () => {
    const edited = applyRoundEdit(aGame(), 2, { isKrakenPlayed: true });
    expect(edited.rounds.map((round) => round.isKrakenPlayed)).toEqual([false, true]);
    expect(edited.rounds.map((round) => round.isWhiteWhaleDiscard)).toEqual([false, false]);
  });

  it('marks the White Whale discard without touching the kraken', () => {
    const edited = applyRoundEdit(aGame(), 1, { isWhiteWhaleDiscard: true });
    expect(edited.rounds[0]?.isWhiteWhaleDiscard).toBe(true);
    expect(edited.rounds[0]?.isKrakenPlayed).toBe(false);
  });
});

describe('applyPhaseEdit', () => {
  it('moves the phase within the current round without touching its entries', () => {
    const edited = applyPhaseEdit(aGame(), 2, 'scoring');
    expect(edited.phase).toBe('scoring');
    expect(edited.currentRound).toBe(2);
    expect(edited.rounds).toEqual(aGame().rounds);
  });

  it('opens the next round with its cards dealt and empty entries', () => {
    const edited = applyPhaseEdit(aGame(), 3, 'bidding');
    expect(edited.currentRound).toBe(3);
    expect(edited.rounds[2]).toEqual({
      number: 3,
      cardCount: 3,
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
          bid: null,
          bidAdjustment: 0,
          rascalBet: 0,
          tricks: null,
          bonuses: NO_BONUS,
        },
      ],
    });
  });

  it('drops the rounds after the one it moves back to', () => {
    const edited = applyPhaseEdit(aGame(), 1, 'scoring');
    expect(edited.rounds.map((round) => round.number)).toEqual([1]);
  });
});

describe('applyPlayerEdit', () => {
  it('changes the named fields of the one player it names', () => {
    const edited = applyPlayerEdit(aGame(), 'p2', { icon: 'crown' });
    expect(edited.players[1]).toEqual({
      id: 'p2',
      seat: 1,
      name: 'Léa',
      icon: 'crown',
      color: 'lagoon',
    });
    expect(edited.players[0]).toEqual(aGame().players[0]);
  });
});

describe('cycleBonus', () => {
  it('adds one card of the kind it names', () => {
    expect(cycleBonus(NO_BONUS, 'pirateBySkullKing')).toEqual({
      ...NO_BONUS,
      pirateBySkullKing: 1,
    });
  });

  it('goes back to zero after the maximum count', () => {
    const atMaximum = { ...NO_BONUS, standardFourteen: MAXIMUM_BONUS_COUNT.standardFourteen };
    expect(cycleBonus(atMaximum, 'standardFourteen').standardFourteen).toBe(0);
  });

  it('still adds one just below the maximum', () => {
    const belowMaximum = { ...NO_BONUS, loot: MAXIMUM_BONUS_COUNT.loot - 1 };
    expect(cycleBonus(belowMaximum, 'loot').loot).toBe(MAXIMUM_BONUS_COUNT.loot);
  });
});

describe('applySeatClaim', () => {
  it('links the seat it names to the account', () => {
    const claimed = applySeatClaim(aGame(), 'p2', 'account-1');
    expect(claimed.players[1]?.accountId).toBe('account-1');
    expect(claimed.players[0]).toEqual(aGame().players[0]);
  });
});

describe('applyEntryEdit with a bid adjustment', () => {
  it('records the Harry the Giant adjustment and keeps the bid', () => {
    const edited = applyEntryEdit(aGame(), 1, 'p1', { bidAdjustment: 1 });
    expect(edited.rounds[0]?.entries[0]?.bidAdjustment).toBe(1);
    expect(edited.rounds[0]?.entries[0]?.bid).toBe(1);
  });
});

describe('selectNextBidAdjustment', () => {
  it('takes the adjustment picked', () => {
    expect(selectNextBidAdjustment(0, -1)).toBe(-1);
    expect(selectNextBidAdjustment(-1, 1)).toBe(1);
  });

  it('resets to zero when the same adjustment is picked again', () => {
    expect(selectNextBidAdjustment(1, 1)).toBe(0);
  });
});

describe('cycleRascalBet', () => {
  it('raises the bet from nothing to ten to twenty, then back to nothing', () => {
    expect(cycleRascalBet(0)).toBe(10);
    expect(cycleRascalBet(10)).toBe(20);
    expect(cycleRascalBet(20)).toBe(0);
  });
});

describe('applyEntryEdit with a Rascal bet', () => {
  it('records the bet and keeps the rest', () => {
    const edited = applyEntryEdit(aGame(), 1, 'p1', { rascalBet: 20 });
    expect(edited.rounds[0]?.entries[0]?.rascalBet).toBe(20);
    expect(edited.rounds[0]?.entries[0]?.bidAdjustment).toBe(0);
  });
});

describe('applyGameEdit', () => {
  it('applies each kind of edit the way its own function does', () => {
    const game = aGame();

    expect(
      applyGameEdit(game, { kind: 'entry', roundNumber: 2, playerId: 'p1', edit: { bid: 2 } }),
    ).toStrictEqual(applyEntryEdit(game, 2, 'p1', { bid: 2 }));
    expect(
      applyGameEdit(game, { kind: 'round', roundNumber: 1, edit: { isKrakenPlayed: true } }),
    ).toStrictEqual(applyRoundEdit(game, 1, { isKrakenPlayed: true }));
    expect(applyGameEdit(game, { kind: 'phase', round: 2, phase: 'scoring' })).toStrictEqual(
      applyPhaseEdit(game, 2, 'scoring'),
    );
    expect(
      applyGameEdit(game, { kind: 'player', playerId: 'p2', edit: { name: 'Léane' } }),
    ).toStrictEqual(applyPlayerEdit(game, 'p2', { name: 'Léane' }));
    expect(applyGameEdit(game, { kind: 'seat', playerId: 'p1', accountId: 'me' })).toStrictEqual(
      applySeatClaim(game, 'p1', 'me'),
    );
  });
});
