import { describe, expect, it } from 'vitest';
import { easeTowards, selectStarClock } from './galaxy-clock.core';

const PREVIOUS_CLOCK = { elapsedSeconds: 12, travelledDistance: 3 };

// @FollowsBlueprint test-pure-unit
describe('selectStarClock', () => {
  it('advances the clock with the timestamp', () => {
    expect(selectStarClock(false, 12_050, 0.5, PREVIOUS_CLOCK).elapsedSeconds).toBe(12.05);
  });

  it('adds the distance this frame covered to the distance already travelled', () => {
    expect(selectStarClock(false, 12_050, 0.5, PREVIOUS_CLOCK).travelledDistance).toBeCloseTo(
      3.0025,
      6,
    );
  });

  it('accumulates rather than deriving distance from the clock, so a speed change does not tear', () => {
    const firstFrame = selectStarClock(false, 12_050, 0.5, PREVIOUS_CLOCK);
    const afterSpeedJump = selectStarClock(false, 12_100, 65, firstFrame);
    expect(afterSpeedJump.travelledDistance).toBeCloseTo(3.0025 + 0.325, 6);
  });

  it('charges a background tab returning after a minute as a single long frame', () => {
    expect(selectStarClock(false, 72_000, 0.5, PREVIOUS_CLOCK).travelledDistance).toBeCloseTo(
      3.005,
      6,
    );
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
