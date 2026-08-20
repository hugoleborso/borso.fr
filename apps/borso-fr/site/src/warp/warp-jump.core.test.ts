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

  it('reaches its nominal top at the end of the jump', () => {
    expect(selectJumpIntensity(JUMP_DURATION_MILLISECONDS)).toEqual({
      starSpeedMultiplier: 200,
      glowMultiplier: 2.1,
    });
  });

  it('keeps building past the end, because the page is still on screen', () => {
    const atTheEnd = selectJumpIntensity(JUMP_DURATION_MILLISECONDS);
    const shortlyAfter = selectJumpIntensity(JUMP_DURATION_MILLISECONDS + 80);
    expect(shortlyAfter.starSpeedMultiplier).toBeGreaterThan(atTheEnd.starSpeedMultiplier);
    expect(shortlyAfter.glowMultiplier).toBeGreaterThan(atTheEnd.glowMultiplier);
    expect(shortlyAfter.starSpeedMultiplier).toBeCloseTo(1 + 1.21 * 199, 5);
  });

  it('stops building where the field would start to flicker', () => {
    const ceiling = { starSpeedMultiplier: 1 + 1.6 * 199, glowMultiplier: 1 + 1.6 * 1.1 };
    expect(selectJumpIntensity(JUMP_DURATION_MILLISECONDS * 1.3)).toEqual(ceiling);
    expect(selectJumpIntensity(JUMP_DURATION_MILLISECONDS * 20)).toEqual(ceiling);
  });

  it('is a quarter of the way up at half time, so the click gets an answer early', () => {
    const halfway = selectJumpIntensity(JUMP_DURATION_MILLISECONDS / 2);
    expect(halfway.starSpeedMultiplier).toBeCloseTo(1 + 0.25 * 199, 5);
    expect(halfway.glowMultiplier).toBeCloseTo(1 + 0.25 * 1.1, 5);
  });

  it('still spends most of its speed at the end', () => {
    const nineTenths = selectJumpIntensity(JUMP_DURATION_MILLISECONDS * 0.9);
    expect(nineTenths.starSpeedMultiplier).toBeCloseTo(1 + 0.81 * 199, 5);
  });
});

describe('selectIntensityAt', () => {
  it('multiplies nothing while the galaxy is only cruising', () => {
    expect(selectIntensityAt(null, 9999)).toEqual({ starSpeedMultiplier: 1, glowMultiplier: 1 });
  });

  it('reads the jump from when it started rather than from the clock', () => {
    expect(selectIntensityAt(1000, 1000 + JUMP_DURATION_MILLISECONDS)).toEqual({
      starSpeedMultiplier: 200,
      glowMultiplier: 2.1,
    });
  });
});
