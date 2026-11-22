import { describe, expect, it } from 'vitest';
import {
  type BonusCounts,
  isBidMade,
  selectFinalBid,
  NO_BONUS,
  scoreEntry,
  selectTricksTaken,
  sumBonusPoints,
} from './scoring.core';

const withBonus = (bonuses: Partial<BonusCounts>): BonusCounts => ({ ...NO_BONUS, ...bonuses });

// @FollowsBlueprint test-pure-unit
describe('scoreEntry', () => {
  it('scores nothing while the bid is missing', () => {
    expect(
      scoreEntry({ bidAdjustment: 0, rascalBet: 0, bid: null, tricks: null, bonuses: NO_BONUS }, 3),
    ).toBeNull();
    expect(
      scoreEntry({ bidAdjustment: 0, rascalBet: 0, bid: null, tricks: 2, bonuses: NO_BONUS }, 3),
    ).toBeNull();
  });

  it('reads a missing tricks value as the bid made', () => {
    expect(
      scoreEntry({ bidAdjustment: 0, rascalBet: 0, bid: 3, tricks: null, bonuses: NO_BONUS }, 5),
    ).toBe(60);
  });

  it('awards 20 points a trick and the bonuses when the bid is made', () => {
    expect(
      scoreEntry(
        {
          bidAdjustment: 0,
          rascalBet: 0,
          bid: 2,
          tricks: 2,
          bonuses: withBonus({ blackFourteen: 1 }),
        },
        5,
      ),
    ).toBe(60);
  });

  it('takes 10 points per trick of difference and no bonus when the bid is missed', () => {
    expect(
      scoreEntry(
        { bidAdjustment: 0, rascalBet: 0, bid: 2, tricks: 4, bonuses: withBonus({ loot: 1 }) },
        5,
      ),
    ).toBe(-20);
    expect(
      scoreEntry({ bidAdjustment: 0, rascalBet: 0, bid: 3, tricks: 1, bonuses: NO_BONUS }, 5),
    ).toBe(-20);
  });

  it('pays 10 points per card dealt for a zero bid made, bonuses included', () => {
    expect(
      scoreEntry({ bidAdjustment: 0, rascalBet: 0, bid: 0, tricks: 0, bonuses: NO_BONUS }, 7),
    ).toBe(70);
    expect(
      scoreEntry(
        { bidAdjustment: 0, rascalBet: 0, bid: 0, tricks: null, bonuses: withBonus({ loot: 1 }) },
        7,
      ),
    ).toBe(90);
  });

  it('takes 10 points per card dealt for a zero bid missed, however many tricks', () => {
    expect(
      scoreEntry({ bidAdjustment: 0, rascalBet: 0, bid: 0, tricks: 2, bonuses: NO_BONUS }, 9),
    ).toBe(-90);
  });
});

describe('the bid Harry the Giant moved', () => {
  it('scores against the bid after the adjustment, never below zero', () => {
    expect(
      selectFinalBid({ bidAdjustment: 1, rascalBet: 0, bid: 2, tricks: null, bonuses: NO_BONUS }),
    ).toBe(3);
    expect(
      selectFinalBid({ bidAdjustment: -1, rascalBet: 0, bid: 0, tricks: null, bonuses: NO_BONUS }),
    ).toBe(0);
    expect(
      selectFinalBid({
        bidAdjustment: 1,
        rascalBet: 0,
        bid: null,
        tricks: null,
        bonuses: NO_BONUS,
      }),
    ).toBeNull();
    expect(
      scoreEntry({ bidAdjustment: -1, rascalBet: 0, bid: 3, tricks: 2, bonuses: NO_BONUS }, 5),
    ).toBe(40);
    expect(
      scoreEntry({ bidAdjustment: 1, rascalBet: 0, bid: 3, tricks: 3, bonuses: NO_BONUS }, 5),
    ).toBe(-10);
  });

  it('turns a bid of one into a zero bid scored on the cards dealt', () => {
    expect(
      scoreEntry({ bidAdjustment: -1, rascalBet: 0, bid: 1, tricks: 0, bonuses: NO_BONUS }, 6),
    ).toBe(60);
  });
});

describe('the bet Rascal of Roatan placed', () => {
  it('adds the bet to a made bid and takes it from a missed one', () => {
    expect(
      scoreEntry({ bidAdjustment: 0, rascalBet: 20, bid: 2, tricks: null, bonuses: NO_BONUS }, 5),
    ).toBe(60);
    expect(
      scoreEntry({ bidAdjustment: 0, rascalBet: 10, bid: 2, tricks: 3, bonuses: NO_BONUS }, 5),
    ).toBe(-20);
    expect(
      scoreEntry({ bidAdjustment: 0, rascalBet: 10, bid: 0, tricks: 1, bonuses: NO_BONUS }, 4),
    ).toBe(-50);
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

  it('takes the tricks when given and the bid otherwise', () => {
    expect(
      selectTricksTaken({ bidAdjustment: 0, rascalBet: 0, bid: 2, tricks: 1, bonuses: NO_BONUS }),
    ).toBe(1);
    expect(
      selectTricksTaken({
        bidAdjustment: 0,
        rascalBet: 0,
        bid: 2,
        tricks: null,
        bonuses: NO_BONUS,
      }),
    ).toBe(2);
  });

  it('calls a bid made only when it exists and was hit', () => {
    expect(
      isBidMade({ bidAdjustment: 0, rascalBet: 0, bid: 2, tricks: null, bonuses: NO_BONUS }),
    ).toBe(true);
    expect(
      isBidMade({ bidAdjustment: 0, rascalBet: 0, bid: 2, tricks: 3, bonuses: NO_BONUS }),
    ).toBe(false);
    expect(
      isBidMade({ bidAdjustment: 0, rascalBet: 0, bid: null, tricks: null, bonuses: NO_BONUS }),
    ).toBe(false);
  });
});
