import { describe, expect, it } from 'vitest';
import {
  type BonusCounts,
  isBidMade,
  selectFinalBid,
  NO_BONUS,
  type ScoredEntry,
  scoreEntry,
  selectTricksTaken,
  sumBonusPoints,
} from './scoring.core';

const withBonus = (bonuses: Partial<BonusCounts>): BonusCounts => ({ ...NO_BONUS, ...bonuses });

const anEntry = (fields: Partial<ScoredEntry>): ScoredEntry => ({
  bid: null,
  bidAdjustment: 0,
  rascalBet: 0,
  isMissed: false,
  tricks: null,
  bonuses: NO_BONUS,
  ...fields,
});

// @FollowsBlueprint test-pure-unit
describe('scoreEntry', () => {
  it('scores nothing while the bid is missing', () => {
    expect(scoreEntry(anEntry({ bid: null }), 3)).toBeNull();
    expect(scoreEntry(anEntry({ bid: null, isMissed: true, tricks: 2 }), 3)).toBeNull();
  });

  it('reads a bid nobody marked missed as made', () => {
    expect(scoreEntry(anEntry({ bid: 3 }), 5)).toBe(60);
  });

  it('ignores tricks left on a bid marked made', () => {
    expect(scoreEntry(anEntry({ bid: 3, isMissed: false, tricks: 1 }), 5)).toBe(60);
  });

  it('scores nothing for a missed bid whose tricks are not entered yet', () => {
    expect(scoreEntry(anEntry({ bid: 3, isMissed: true, tricks: null }), 5)).toBeNull();
  });

  it('awards 20 points a trick and the bonuses when the bid is made', () => {
    expect(scoreEntry(anEntry({ bid: 2, bonuses: withBonus({ blackFourteen: 1 }) }), 5)).toBe(60);
  });

  it('takes 10 points per trick of difference and no bonus when the bid is missed', () => {
    expect(
      scoreEntry(
        anEntry({ bid: 2, isMissed: true, tricks: 4, bonuses: withBonus({ loot: 1 }) }),
        5,
      ),
    ).toBe(-20);
    expect(scoreEntry(anEntry({ bid: 3, isMissed: true, tricks: 1 }), 5)).toBe(-20);
  });

  it('pays 10 points per card dealt for a zero bid made, bonuses included', () => {
    expect(scoreEntry(anEntry({ bid: 0, isMissed: true, tricks: 0 }), 7)).toBe(70);
    expect(scoreEntry(anEntry({ bid: 0, bonuses: withBonus({ loot: 1 }) }), 7)).toBe(90);
  });

  it('takes 10 points per card dealt for a zero bid missed, however many tricks', () => {
    expect(scoreEntry(anEntry({ bid: 0, isMissed: true, tricks: 2 }), 9)).toBe(-90);
  });
});

describe('the bid Harry the Giant moved', () => {
  it('scores against the bid after the adjustment, never below zero', () => {
    expect(selectFinalBid(anEntry({ bidAdjustment: 1, bid: 2 }))).toBe(3);
    expect(selectFinalBid(anEntry({ bidAdjustment: -1, bid: 0 }))).toBe(0);
    expect(selectFinalBid(anEntry({ bidAdjustment: 1, bid: null }))).toBeNull();
    expect(scoreEntry(anEntry({ bidAdjustment: -1, bid: 3, isMissed: true, tricks: 2 }), 5)).toBe(
      40,
    );
    expect(scoreEntry(anEntry({ bidAdjustment: 1, bid: 3, isMissed: true, tricks: 3 }), 5)).toBe(
      -10,
    );
  });

  it('turns a bid of one into a zero bid scored on the cards dealt', () => {
    expect(scoreEntry(anEntry({ bidAdjustment: -1, bid: 1, isMissed: true, tricks: 0 }), 6)).toBe(
      60,
    );
  });
});

describe('the bet Rascal of Roatan placed', () => {
  it('adds the bet to a made bid and takes it from a missed one', () => {
    expect(scoreEntry(anEntry({ rascalBet: 20, bid: 2 }), 5)).toBe(60);
    expect(scoreEntry(anEntry({ rascalBet: 10, bid: 2, isMissed: true, tricks: 3 }), 5)).toBe(-20);
    expect(scoreEntry(anEntry({ rascalBet: 10, bid: 0, isMissed: true, tricks: 1 }), 4)).toBe(-50);
  });
});

describe('the bonus and trick helpers', () => {
  it('sums every bonus kind at its value', () => {
    expect(
      sumBonusPoints({
        standardFourteen: 2,
        blackFourteen: 1,
        mermaidByPirate: 1,
        pirateBySkullKing: 1,
        skullKingByMermaid: 1,
        loot: 1,
      }),
    ).toBe(20 + 20 + 20 + 30 + 40 + 20);
  });

  it('takes the tricks of a missed bid and the final bid of a made one', () => {
    expect(selectTricksTaken(anEntry({ bid: 2, isMissed: true, tricks: 1 }))).toBe(1);
    expect(selectTricksTaken(anEntry({ bid: 2, isMissed: false, tricks: 1 }))).toBe(2);
    expect(selectTricksTaken(anEntry({ bid: 2, bidAdjustment: 1 }))).toBe(3);
  });

  it('knows no tricks for a missed bid nobody counted yet', () => {
    expect(selectTricksTaken(anEntry({ bid: 2, isMissed: true, tricks: null }))).toBeNull();
  });

  it('calls a bid made only when it exists and was hit', () => {
    expect(isBidMade(anEntry({ bid: 2 }))).toBe(true);
    expect(isBidMade(anEntry({ bid: 2, isMissed: true, tricks: 3 }))).toBe(false);
    expect(isBidMade(anEntry({ bid: 2, isMissed: true, tricks: null }))).toBe(false);
    expect(isBidMade(anEntry({ bid: null }))).toBe(false);
  });
});
