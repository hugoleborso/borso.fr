import { describe, expect, it } from 'vitest';
import { buildEnergyLevels, levelFromKey, levelFromPointerRatio } from './energy-bar.utils';

const MINIMUM = 1;
const MAXIMUM = 10;

// @FollowsBlueprint test-pure-unit
describe('buildEnergyLevels', () => {
  it('lists every level from the minimum to the maximum', () => {
    expect(buildEnergyLevels(MINIMUM, MAXIMUM)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('lists a single level when both bounds meet', () => {
    expect(buildEnergyLevels(4, 4)).toEqual([4]);
  });
});

// @FollowsBlueprint test-pure-unit
describe('levelFromPointerRatio', () => {
  it('reads the left edge as the minimum', () => {
    expect(levelFromPointerRatio(0, MINIMUM, MAXIMUM)).toBe(1);
  });

  it('reads the right edge as the maximum', () => {
    expect(levelFromPointerRatio(1, MINIMUM, MAXIMUM)).toBe(10);
  });

  it('reads a segment as the level it draws', () => {
    expect(levelFromPointerRatio(0.65, MINIMUM, MAXIMUM)).toBe(7);
  });

  it('reads the first pixel of a segment as that segment', () => {
    expect(levelFromPointerRatio(0.6, MINIMUM, MAXIMUM)).toBe(7);
  });

  it('reads the last pixel of a segment as that segment', () => {
    expect(levelFromPointerRatio(0.5999, MINIMUM, MAXIMUM)).toBe(6);
  });

  it('clamps a pointer dragged past the left edge', () => {
    expect(levelFromPointerRatio(-0.4, MINIMUM, MAXIMUM)).toBe(1);
  });

  it('clamps a pointer dragged past the right edge', () => {
    expect(levelFromPointerRatio(1.8, MINIMUM, MAXIMUM)).toBe(10);
  });

  it('falls back to the minimum when the bar has no measured width', () => {
    expect(levelFromPointerRatio(Number.NaN, MINIMUM, MAXIMUM)).toBe(1);
  });
});

// @FollowsBlueprint test-pure-unit
describe('levelFromKey', () => {
  it('steps up on the right arrow', () => {
    expect(levelFromKey('ArrowRight', 5, MINIMUM, MAXIMUM)).toBe(6);
  });

  it('steps up on the up arrow', () => {
    expect(levelFromKey('ArrowUp', 5, MINIMUM, MAXIMUM)).toBe(6);
  });

  it('steps down on the left arrow', () => {
    expect(levelFromKey('ArrowLeft', 5, MINIMUM, MAXIMUM)).toBe(4);
  });

  it('steps down on the down arrow', () => {
    expect(levelFromKey('ArrowDown', 5, MINIMUM, MAXIMUM)).toBe(4);
  });

  it('holds at the maximum', () => {
    expect(levelFromKey('ArrowRight', MAXIMUM, MINIMUM, MAXIMUM)).toBe(10);
  });

  it('holds at the minimum', () => {
    expect(levelFromKey('ArrowLeft', MINIMUM, MINIMUM, MAXIMUM)).toBe(1);
  });

  it('jumps to the minimum on Home', () => {
    expect(levelFromKey('Home', 8, MINIMUM, MAXIMUM)).toBe(1);
  });

  it('jumps to the maximum on End', () => {
    expect(levelFromKey('End', 2, MINIMUM, MAXIMUM)).toBe(10);
  });

  it('leaves every other key to the browser', () => {
    expect(levelFromKey('Tab', 5, MINIMUM, MAXIMUM)).toBeNull();
  });
});
