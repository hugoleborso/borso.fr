import { describe, expect, it } from 'vitest';
import { easeTowards, selectStarClock } from './galaxy-clock.core';

const PREVIOUS_CLOCK = { elapsedSeconds: 12, travelledDistance: 3 };

describe('selectStarClock', () => {
  it('advances the clock with the timestamp', () => {
    expect(selectStarClock(false, 2000, 0.5, PREVIOUS_CLOCK)).toEqual({
      elapsedSeconds: 2,
      travelledDistance: 0.1,
    });
  });

  it('holds the previous reading while the animation is paused', () => {
    expect(selectStarClock(true, 2000, 0.5, PREVIOUS_CLOCK)).toBe(PREVIOUS_CLOCK);
  });
});

describe('easeTowards', () => {
  it('moves part of the way towards the target', () => {
    expect(easeTowards(0, 1)).toBeCloseTo(0.05);
  });

  it('stays put when it is already at the target', () => {
    expect(easeTowards(0.5, 0.5)).toBe(0.5);
  });
});
