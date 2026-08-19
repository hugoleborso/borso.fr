import { describe, expect, it } from 'vitest';
import { JUMP_DURATION_MILLISECONDS, selectIntensityAt } from './warp-jump.core';

const STARTED_AT = 4000;

/** Reads the jump the way the store does, from a start time and a clock. */
function selectJumpIntensity(elapsedMilliseconds: number) {
  return selectIntensityAt(STARTED_AT, STARTED_AT + elapsedMilliseconds);
}

// @FollowsBlueprint test-pure-unit
describe('selectJumpIntensity', () => {
  it('leaves the galaxy at its cruising speed the moment the jump starts', () => {
    expect(selectJumpIntensity(0)).toEqual({ starSpeedMultiplier: 1, glowMultiplier: 1 });
  });

  it('leaves the galaxy alone for a reading from before the jump', () => {
    expect(selectJumpIntensity(-50)).toEqual({ starSpeedMultiplier: 1, glowMultiplier: 1 });
  });

  it('reaches full speed at the end of the jump', () => {
    expect(selectJumpIntensity(JUMP_DURATION_MILLISECONDS)).toEqual({
      starSpeedMultiplier: 120,
      glowMultiplier: 1.9,
    });
  });

  it('holds full speed past the end, for the frames between the last one and the navigation', () => {
    expect(selectJumpIntensity(JUMP_DURATION_MILLISECONDS + 500)).toEqual({
      starSpeedMultiplier: 120,
      glowMultiplier: 1.9,
    });
  });

  it('is a quarter of the way up at half time, so the click gets an answer early', () => {
    const halfway = selectJumpIntensity(JUMP_DURATION_MILLISECONDS / 2);
    expect(halfway.starSpeedMultiplier).toBeCloseTo(1 + 0.25 * 119, 5);
    expect(halfway.glowMultiplier).toBeCloseTo(1 + 0.25 * 0.9, 5);
  });

  it('still spends most of its speed at the end', () => {
    const nineTenths = selectJumpIntensity(JUMP_DURATION_MILLISECONDS * 0.9);
    expect(nineTenths.starSpeedMultiplier).toBeCloseTo(1 + 0.81 * 119, 5);
  });
});

describe('selectIntensityAt', () => {
  it('multiplies nothing while the galaxy is only cruising', () => {
    expect(selectIntensityAt(null, 9999)).toEqual({ starSpeedMultiplier: 1, glowMultiplier: 1 });
  });

  it('reads the jump from when it started rather than from the clock', () => {
    expect(selectIntensityAt(1000, 1000 + JUMP_DURATION_MILLISECONDS)).toEqual({
      starSpeedMultiplier: 120,
      glowMultiplier: 1.9,
    });
  });
});
