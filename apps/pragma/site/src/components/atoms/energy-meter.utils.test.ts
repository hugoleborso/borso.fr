import { describe, expect, it } from 'vitest';
import { barHeightRatio, levelFromTravel } from './energy-meter.utils';

const MINIMUM = 1;
const MAXIMUM = 10;

describe('levelFromTravel', () => {
  it('holds the level while the finger has not crossed half a step', () => {
    expect(levelFromTravel(5, 0, MINIMUM, MAXIMUM)).toBe(5);
    expect(levelFromTravel(5, 15, MINIMUM, MAXIMUM)).toBe(5);
    expect(levelFromTravel(5, -15, MINIMUM, MAXIMUM)).toBe(5);
  });

  it('advances one level per 32 px of travel, in both directions', () => {
    expect(levelFromTravel(5, 32, MINIMUM, MAXIMUM)).toBe(6);
    expect(levelFromTravel(5, 96, MINIMUM, MAXIMUM)).toBe(8);
    expect(levelFromTravel(5, -64, MINIMUM, MAXIMUM)).toBe(3);
  });

  it('clamps at both ends rather than running off the scale', () => {
    expect(levelFromTravel(9, 500, MINIMUM, MAXIMUM)).toBe(MAXIMUM);
    expect(levelFromTravel(2, -500, MINIMUM, MAXIMUM)).toBe(MINIMUM);
  });

  it('answers nothing for a travel that is not a number', () => {
    expect(levelFromTravel(5, Number.NaN, MINIMUM, MAXIMUM)).toBeNull();
    expect(levelFromTravel(5, Number.POSITIVE_INFINITY, MINIMUM, MAXIMUM)).toBeNull();
  });
});

describe('barHeightRatio', () => {
  it('keeps the lowest bar visible and the highest full', () => {
    expect(barHeightRatio(MINIMUM, MINIMUM, MAXIMUM)).toBeCloseTo(0.28);
    expect(barHeightRatio(MAXIMUM, MINIMUM, MAXIMUM)).toBeCloseTo(1);
  });

  it('rises monotonically between the ends', () => {
    const ratios = [2, 3, 4, 5].map((level) => barHeightRatio(level, MINIMUM, MAXIMUM));
    expect(ratios).toEqual([...ratios].sort((left, right) => left - right));
  });

  it('answers a full bar for a degenerate scale rather than dividing by zero', () => {
    expect(barHeightRatio(4, 4, 4)).toBe(1);
  });
});
