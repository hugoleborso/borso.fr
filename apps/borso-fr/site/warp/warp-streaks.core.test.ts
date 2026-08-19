import { describe, expect, it } from 'vitest';
import {
  buildWarpStreaks,
  selectJumpStyleProperties,
  selectStreakColor,
  selectStreakStyleProperties,
  WARP_DURATION_MILLISECONDS,
  type WarpStreak,
} from './warp-streaks.core';

/** One draw per value a streak needs, in the order `buildStreak` asks for them. */
function scriptRandomValues(values: readonly number[]): () => number {
  const remaining = [...values];
  return () => remaining.shift() ?? 0;
}

const ONE_STREAK_SCRIPT = [0.5, 0.25, 0.75, 0.1, 0.2, 0.4, 0.6, 0.8];

const EXPECTED_STREAK: WarpStreak = {
  angleDegrees: 270,
  startDistanceVmax: 7.5,
  endDistanceVmax: 78.75,
  lengthVmax: 7.4,
  thicknessPixels: 1.36,
  durationMilliseconds: 364,
  delayMilliseconds: 336,
  color: 'var(--color-warp-core)',
};

// @FollowsBlueprint test-pure-unit
describe('buildWarpStreaks', () => {
  it('resolves every value of a streak from the generator it was handed', () => {
    expect(buildWarpStreaks(1, scriptRandomValues(ONE_STREAK_SCRIPT))).toEqual([EXPECTED_STREAK]);
  });

  it('flies each trail out from where it started', () => {
    const [streak] = buildWarpStreaks(1, scriptRandomValues([0, 0, 0, 0, 0, 0, 0, 0]));
    expect(streak).toEqual({
      angleDegrees: 0,
      startDistanceVmax: 3,
      endDistanceVmax: 58,
      lengthVmax: 5,
      thicknessPixels: 1,
      durationMilliseconds: 260,
      delayMilliseconds: 0,
      color: 'var(--color-warp-ember)',
    });
  });

  it('reaches the far corner of the viewport when every draw is at its top', () => {
    const [streak] = buildWarpStreaks(1, scriptRandomValues([1, 1, 1, 1, 1, 1, 1, 1]));
    expect(streak).toEqual({
      angleDegrees: 360,
      startDistanceVmax: 12,
      endDistanceVmax: 132,
      lengthVmax: 29,
      thicknessPixels: 2.8,
      durationMilliseconds: 520,
      delayMilliseconds: 560,
      color: 'var(--color-warp-core)',
    });
  });

  it('builds as many streaks as it was asked for', () => {
    expect(buildWarpStreaks(3, scriptRandomValues([]))).toHaveLength(3);
  });

  it('builds nothing when asked for nothing', () => {
    expect(buildWarpStreaks(0, scriptRandomValues([]))).toEqual([]);
  });
});

describe('selectStreakColor', () => {
  it('draws an ember below the ember share', () => {
    expect(selectStreakColor(0)).toBe('var(--color-warp-ember)');
    expect(selectStreakColor(0.119)).toBe('var(--color-warp-ember)');
  });

  it('draws the periwinkle glow from the ember share up to the glow share', () => {
    expect(selectStreakColor(0.12)).toBe('var(--color-warp-glow)');
    expect(selectStreakColor(0.549)).toBe('var(--color-warp-glow)');
  });

  it('draws the white core from the glow share up', () => {
    expect(selectStreakColor(0.55)).toBe('var(--color-warp-core)');
    expect(selectStreakColor(1)).toBe('var(--color-warp-core)');
  });
});

describe('selectStreakStyleProperties', () => {
  it('writes every value the keyframes read, with its unit', () => {
    expect(selectStreakStyleProperties(EXPECTED_STREAK)).toEqual({
      '--warp-angle': '270deg',
      '--warp-start': '7.5vmax',
      '--warp-end': '78.75vmax',
      '--warp-length': '7.4vmax',
      '--warp-thickness': '1.36px',
      '--warp-color': 'var(--color-warp-core)',
      'animation-duration': '364ms',
      'animation-delay': '336ms',
    });
  });
});

describe('selectJumpStyleProperties', () => {
  it('hands the veil and the flash the length of the jump', () => {
    expect(selectJumpStyleProperties()).toEqual({ 'animation-duration': '820ms' });
  });

  it('names the same length the navigation waits out', () => {
    expect(selectJumpStyleProperties()['animation-duration']).toBe(
      `${WARP_DURATION_MILLISECONDS}ms`,
    );
  });
});
