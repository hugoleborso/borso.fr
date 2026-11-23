import { NO_BONUS } from '@domain/scoring.core';
import { describe, expect, it } from 'vitest';
import {
  formatCount,
  selectBidStepEdit,
  selectCountSteps,
  selectMissedTricksStepEdit,
  selectTricksTakenStepEdit,
  stepBid,
  stepMissedTricks,
  stepTricksTaken,
} from './count-stepper.core';
import type { GameEntry } from './game-view.core';

const CARD_COUNT = 5;

const MADE: GameEntry = {
  playerId: 'p1',
  bid: 2,
  bidAdjustment: 0,
  rascalBet: 0,
  isMissed: false,
  tricks: null,
  bonuses: NO_BONUS,
};

const MISSED: GameEntry = { ...MADE, isMissed: true };

// @FollowsBlueprint test-pure-unit
describe('stepBid', () => {
  it('sets zero on minus and one on plus when no bid is set', () => {
    expect(stepBid(null, -1, CARD_COUNT)).toBe(0);
    expect(stepBid(null, 1, CARD_COUNT)).toBe(1);
  });

  it('moves a bid by one in either direction', () => {
    expect(stepBid(2, -1, CARD_COUNT)).toBe(1);
    expect(stepBid(2, 1, CARD_COUNT)).toBe(3);
  });

  it('reaches both ends of the cards dealt', () => {
    expect(stepBid(1, -1, CARD_COUNT)).toBe(0);
    expect(stepBid(CARD_COUNT - 1, 1, CARD_COUNT)).toBe(CARD_COUNT);
  });

  it('finds no step below zero or above the cards dealt', () => {
    expect(stepBid(0, -1, CARD_COUNT)).toBeNull();
    expect(stepBid(CARD_COUNT, 1, CARD_COUNT)).toBeNull();
  });
});

describe('stepMissedTricks', () => {
  it('starts one below or one above the final bid when no tricks are picked', () => {
    expect(stepMissedTricks(MISSED, -1, CARD_COUNT)).toBe(1);
    expect(stepMissedTricks(MISSED, 1, CARD_COUNT)).toBe(3);
  });

  it('starts from the bid Harry moved', () => {
    expect(stepMissedTricks({ ...MISSED, bidAdjustment: 1 }, 1, CARD_COUNT)).toBe(4);
  });

  it('moves the tricks by one away from the bid', () => {
    expect(stepMissedTricks({ ...MISSED, tricks: 1 }, -1, CARD_COUNT)).toBe(0);
    expect(stepMissedTricks({ ...MISSED, tricks: 3 }, 1, CARD_COUNT)).toBe(4);
  });

  it('skips over the final bid, which a missed bid cannot take', () => {
    expect(stepMissedTricks({ ...MISSED, tricks: 1 }, 1, CARD_COUNT)).toBe(3);
    expect(stepMissedTricks({ ...MISSED, tricks: 3 }, -1, CARD_COUNT)).toBe(1);
  });

  it('finds no step that would leave zero to the cards dealt', () => {
    expect(stepMissedTricks({ ...MISSED, tricks: 0 }, -1, CARD_COUNT)).toBeNull();
    expect(stepMissedTricks({ ...MISSED, tricks: CARD_COUNT }, 1, CARD_COUNT)).toBeNull();
    expect(stepMissedTricks({ ...MISSED, tricks: CARD_COUNT - 1 }, 1, CARD_COUNT)).toBe(CARD_COUNT);
  });

  it('finds no step that could only land on the bid', () => {
    expect(stepMissedTricks({ ...MISSED, bid: 0 }, -1, CARD_COUNT)).toBeNull();
    expect(stepMissedTricks({ ...MISSED, bid: 1, tricks: 0 }, 1, CARD_COUNT)).toBe(2);
    expect(
      stepMissedTricks({ ...MISSED, bid: CARD_COUNT, tricks: CARD_COUNT - 1 }, 1, CARD_COUNT),
    ).toBeNull();
  });

  it('finds no step without a bid to start from', () => {
    expect(stepMissedTricks({ ...MISSED, bid: null }, 1, CARD_COUNT)).toBeNull();
  });
});

describe('stepTricksTaken', () => {
  it('moves a made bid onto the next tricks, missed either way', () => {
    expect(stepTricksTaken(MADE, -1, CARD_COUNT)).toBe(1);
    expect(stepTricksTaken(MADE, 1, CARD_COUNT)).toBe(3);
  });

  it('lands on the bid, which reads as made', () => {
    expect(stepTricksTaken({ ...MISSED, tricks: 1 }, 1, CARD_COUNT)).toBe(2);
  });

  it('starts from the bid when a missed bid has no tricks yet', () => {
    expect(stepTricksTaken(MISSED, -1, CARD_COUNT)).toBe(1);
  });

  it('finds no step outside zero to the cards dealt', () => {
    expect(stepTricksTaken({ ...MISSED, tricks: 0 }, -1, CARD_COUNT)).toBeNull();
    expect(stepTricksTaken({ ...MADE, bid: CARD_COUNT }, 1, CARD_COUNT)).toBeNull();
  });

  it('finds no step without a bid', () => {
    expect(stepTricksTaken({ ...MADE, bid: null }, 1, CARD_COUNT)).toBeNull();
  });
});

describe('selectCountSteps', () => {
  it('offers minus and plus, each disabled when it finds no step', () => {
    expect(selectCountSteps((direction) => (direction === 1 ? 1 : null))).toEqual([
      {
        direction: -1,
        text: '−',
        labelKey: 'stepper.less',
        isDisabled: true,
        isPressed: undefined,
      },
      {
        direction: 1,
        text: '+',
        labelKey: 'stepper.more',
        isDisabled: false,
        isPressed: undefined,
      },
    ]);
  });

  it('enables minus and disables plus the other way round', () => {
    const steps = selectCountSteps((direction) => (direction === -1 ? 0 : null));
    expect(steps.map((step) => step.isDisabled)).toEqual([false, true]);
  });
});

describe('formatCount', () => {
  it('shows a dash for no count and the number otherwise', () => {
    expect(formatCount(null)).toBe('–');
    expect(formatCount(0)).toBe('0');
    expect(formatCount(3)).toBe('3');
  });
});

describe('selectBidStepEdit', () => {
  it('writes the stepped bid', () => {
    expect(selectBidStepEdit(null, 1, CARD_COUNT)).toStrictEqual({ bid: 1 });
  });

  it('keeps the bid when there is no step', () => {
    expect(selectBidStepEdit(0, -1, CARD_COUNT)).toStrictEqual({ bid: 0 });
  });
});

describe('selectMissedTricksStepEdit', () => {
  it('writes the stepped tricks on a missed bid', () => {
    expect(selectMissedTricksStepEdit(MISSED, 1, CARD_COUNT)).toStrictEqual({
      isMissed: true,
      tricks: 3,
    });
  });

  it('keeps the tricks when there is no step', () => {
    expect(selectMissedTricksStepEdit({ ...MISSED, tricks: 0 }, -1, CARD_COUNT)).toStrictEqual({
      isMissed: true,
      tricks: 0,
    });
  });
});

describe('selectTricksTakenStepEdit', () => {
  it('marks the bid missed with the stepped tricks', () => {
    expect(selectTricksTakenStepEdit(MADE, -1, CARD_COUNT)).toStrictEqual({
      isMissed: true,
      tricks: 1,
    });
  });

  it('marks the bid made when the step lands on it', () => {
    expect(selectTricksTakenStepEdit({ ...MISSED, tricks: 3 }, -1, CARD_COUNT)).toStrictEqual({
      isMissed: false,
      tricks: null,
    });
  });

  it('changes nothing when there is no step', () => {
    expect(selectTricksTakenStepEdit({ ...MISSED, tricks: 0 }, -1, CARD_COUNT)).toStrictEqual({});
  });
});
