import { ROUND_COUNT } from '@domain/round.core';
import { NO_BONUS } from '@domain/scoring.core';
import { describe, expect, it } from 'vitest';
import type { GameEntry, GameRound } from './game-view.core';
import {
  isAwaitingTricks,
  formatBid,
  formatBidAdjustment,
  hasUnbalancedClosedRound,
  formatRascalBadge,
  isHarryLocked,
  isRascalLocked,
  selectClosingMove,
  selectRoundCheck,
  selectMadeToggleEdit,
  selectRoundEntries,
  selectTallyDisplay,
  selectTricksCorrection,
} from './round-results.core';

const MADE: GameEntry = {
  playerId: 'p1',
  bid: 2,
  bidAdjustment: 0,
  rascalBet: 0,
  isMissed: false,
  tricks: null,
  bonuses: NO_BONUS,
};

const MISSED_WITHOUT_TRICKS: GameEntry = { ...MADE, isMissed: true };

// @FollowsBlueprint test-pure-unit
describe('selectTallyDisplay', () => {
  it('shows an unknown count while a bid or a missed count is missing', () => {
    expect(selectTallyDisplay({ kind: 'incomplete' })).toEqual({
      counted: '?',
      isBalanced: false,
    });
  });

  it('shows a balanced count as balanced', () => {
    expect(selectTallyDisplay({ kind: 'balanced', counted: 5 })).toEqual({
      counted: '5',
      isBalanced: true,
    });
  });

  it('shows an unbalanced count as unbalanced', () => {
    expect(selectTallyDisplay({ kind: 'unbalanced', counted: 4, expected: 5 })).toEqual({
      counted: '4',
      isBalanced: false,
    });
  });
});

describe('isAwaitingTricks', () => {
  it('waits for the tricks of a bid marked missed that has none', () => {
    expect(isAwaitingTricks(MISSED_WITHOUT_TRICKS)).toBe(true);
  });

  it('does not wait once the tricks are picked or the bid is made', () => {
    expect(isAwaitingTricks({ ...MISSED_WITHOUT_TRICKS, tricks: 1 })).toBe(false);
    expect(isAwaitingTricks(MADE)).toBe(false);
    expect(isAwaitingTricks({ ...MADE, tricks: 1 })).toBe(false);
  });
});

describe('selectMadeToggleEdit', () => {
  it('marks a made bid missed at once, before any trick is picked', () => {
    expect(selectMadeToggleEdit(MADE)).toStrictEqual({ isMissed: true });
  });

  it('marks a missed bid made again and clears its tricks', () => {
    expect(selectMadeToggleEdit({ ...MISSED_WITHOUT_TRICKS, tricks: 1 })).toStrictEqual({
      isMissed: false,
      tricks: null,
    });
  });
});

describe('selectTricksCorrection', () => {
  it('marks the bid missed with the tricks taken when they differ from the final bid', () => {
    expect(selectTricksCorrection(1, 2)).toStrictEqual({ isMissed: true, tricks: 1 });
  });

  it('marks the bid made when the tricks equal the final bid', () => {
    expect(selectTricksCorrection(2, 2)).toStrictEqual({ isMissed: false, tricks: null });
  });
});

describe('selectClosingMove', () => {
  it('opens the bids of the next round', () => {
    expect(selectClosingMove(3)).toEqual({ round: 4, phase: 'bidding' });
  });

  it('finishes the game after the last round', () => {
    expect(selectClosingMove(ROUND_COUNT)).toEqual({ round: ROUND_COUNT, phase: 'finished' });
  });

  it('still opens the last round from the one before it', () => {
    expect(selectClosingMove(ROUND_COUNT - 1)).toEqual({ round: ROUND_COUNT, phase: 'bidding' });
  });
});

describe('selectRoundCheck', () => {
  const round: GameRound = {
    number: 3,
    cardCount: 3,
    isKrakenPlayed: false,
    isWhiteWhaleDiscard: false,
    entries: [MADE, { ...MADE, playerId: 'p2', bid: 0, isMissed: true, tricks: 1 }],
  };

  it('balances a round whose tricks add up to the cards dealt', () => {
    expect(selectRoundCheck(round)).toEqual({ counted: '3', expected: 3, isBalanced: true });
  });

  it('expects one trick fewer once the Kraken was played', () => {
    expect(selectRoundCheck({ ...round, isKrakenPlayed: true })).toEqual({
      counted: '3',
      expected: 2,
      isBalanced: false,
    });
  });

  it('flags a round with a bid missing', () => {
    const missing = { ...round, entries: [{ ...MADE, bid: null }] };
    expect(selectRoundCheck(missing)).toEqual({ counted: '?', expected: 3, isBalanced: false });
  });

  it('does not balance while a bid marked missed has no tricks yet', () => {
    const awaiting = { ...round, entries: [MADE, { ...MISSED_WITHOUT_TRICKS, playerId: 'p2' }] };
    expect(selectRoundCheck(awaiting)).toEqual({ counted: '?', expected: 3, isBalanced: false });
  });
});

describe('selectRoundCheck with the White Whale', () => {
  it('expects one trick fewer for a White Whale discard, and two with the Kraken too', () => {
    const round: GameRound = {
      number: 3,
      cardCount: 3,
      isKrakenPlayed: false,
      isWhiteWhaleDiscard: true,
      entries: [{ ...MADE, bid: 2 }],
    };
    expect(selectRoundCheck(round)).toEqual({ counted: '2', expected: 2, isBalanced: true });
    expect(selectRoundCheck({ ...round, isKrakenPlayed: true }).expected).toBe(1);
  });
});

describe('hasUnbalancedClosedRound', () => {
  const balanced: GameRound = {
    number: 1,
    cardCount: 1,
    isKrakenPlayed: false,
    isWhiteWhaleDiscard: false,
    entries: [{ ...MADE, bid: 1 }],
  };
  const unbalanced = { ...balanced, number: 2, cardCount: 2 };
  const game = {
    joinCode: 'BRIG',
    phase: 'bidding' as const,
    currentRound: 3,
    players: [],
    rounds: [balanced, unbalanced],
    revision: 1,
    readAt: '2026-11-22T10:00:00.000Z',
  };

  it('finds a closed round whose tricks do not balance', () => {
    expect(hasUnbalancedClosedRound(game)).toBe(true);
  });

  it('ignores the round being played', () => {
    expect(hasUnbalancedClosedRound({ ...game, currentRound: 2 })).toBe(false);
  });

  it('answers false when every closed round balances', () => {
    expect(hasUnbalancedClosedRound({ ...game, rounds: [balanced] })).toBe(false);
  });
});

describe('selectTricksCorrection with Harry the Giant', () => {
  it('compares the tricks with the adjusted bid', () => {
    expect(selectTricksCorrection(3, 3)).toStrictEqual({ isMissed: false, tricks: null });
  });
});

describe('formatBid', () => {
  it('writes a dash for no bid', () => {
    expect(formatBid({ ...MADE, bid: null })).toBe('\u2013');
  });

  it('writes the bid alone when Harry did not change it', () => {
    expect(formatBid(MADE)).toBe('2');
  });

  it('writes the bid and the adjusted bid when Harry changed it', () => {
    expect(formatBid({ ...MADE, bidAdjustment: 1 })).toBe('2\u21923');
    expect(formatBid({ ...MADE, bidAdjustment: -1 })).toBe('2\u21921');
  });
});

describe('formatBidAdjustment', () => {
  it('shows nothing for no adjustment and a signed one otherwise', () => {
    expect(formatBidAdjustment(0)).toBeNull();
    expect(formatBidAdjustment(1)).toBe('+1');
    expect(formatBidAdjustment(-1)).toBe('\u22121');
  });
});

describe('isHarryLocked', () => {
  const adjusted: GameEntry = { ...MADE, playerId: 'p2', bidAdjustment: 1 };

  it('locks Harry for the other players once one bid is adjusted', () => {
    expect(isHarryLocked([MADE, adjusted], MADE)).toBe(true);
  });

  it('leaves Harry open to the player who used him, and to all before anyone did', () => {
    expect(isHarryLocked([MADE, adjusted], adjusted)).toBe(false);
    expect(isHarryLocked([MADE, { ...MADE, playerId: 'p2' }], MADE)).toBe(false);
  });

  it('never locks Harry away from a player already using him, even beside a second holder', () => {
    const second: GameEntry = { ...MADE, playerId: 'p3', bidAdjustment: -1 };
    expect(isHarryLocked([MADE, adjusted, second], adjusted)).toBe(false);
  });
});

describe('isRascalLocked', () => {
  const betting: GameEntry = { ...MADE, playerId: 'p2', rascalBet: 20 };

  it('locks the Rascal for the other players once one has a bet', () => {
    expect(isRascalLocked([MADE, betting], MADE)).toBe(true);
  });

  it('leaves the Rascal open to the player who bet, and to all before anyone did', () => {
    expect(isRascalLocked([MADE, betting], betting)).toBe(false);
    expect(isRascalLocked([MADE, { ...MADE, playerId: 'p2' }], MADE)).toBe(false);
  });

  it('never locks the Rascal away from a player already betting, even beside a second bettor', () => {
    const second: GameEntry = { ...MADE, playerId: 'p3', rascalBet: 10 };
    expect(isRascalLocked([MADE, betting, second], betting)).toBe(false);
  });
});

describe('formatRascalBadge', () => {
  it('shows nothing without a bet', () => {
    expect(formatRascalBadge(MADE)).toBeNull();
  });

  it('shows the bet won on a made bid and lost on a missed one', () => {
    expect(formatRascalBadge({ ...MADE, rascalBet: 20 })).toBe('+20');
    expect(formatRascalBadge({ ...MADE, rascalBet: 10, isMissed: true, tricks: 0 })).toBe(
      '\u221210',
    );
  });
});

describe('selectRoundEntries', () => {
  const round: GameRound = {
    number: 1,
    cardCount: 1,
    isKrakenPlayed: false,
    isWhiteWhaleDiscard: false,
    entries: [MADE],
  };

  it('lists one entry per player in the order asked, filling a missing one with the defaults', () => {
    expect(selectRoundEntries(round, ['p9', 'p1'])).toEqual([
      {
        playerId: 'p9',
        bid: null,
        bidAdjustment: 0,
        rascalBet: 0,
        isMissed: false,
        tricks: null,
        bonuses: NO_BONUS,
      },
      MADE,
    ]);
  });
});
