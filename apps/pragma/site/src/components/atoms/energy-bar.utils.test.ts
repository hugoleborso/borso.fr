import { describe, expect, it } from 'vitest';
import {
  buildEnergyLevels,
  isDragIntent,
  levelFromKey,
  levelFromPointerRatio,
} from './energy-bar.utils';

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

  it('picks nothing when the bar has no measured width', () => {
    expect(levelFromPointerRatio(Number.NaN, MINIMUM, MAXIMUM)).toBeNull();
  });

  it('picks nothing when a zero width sends the ratio to infinity', () => {
    expect(levelFromPointerRatio(Number.POSITIVE_INFINITY, MINIMUM, MAXIMUM)).toBeNull();
  });
});

// @FollowsBlueprint test-pure-unit
describe('isDragIntent', () => {
  it('reads a sideways slide as a slide', () => {
    expect(isDragIntent(12, 0)).toBe(true);
  });

  it('reads a sideways slide the other way as a slide', () => {
    expect(isDragIntent(-12, 3)).toBe(true);
  });

  it('reads the threshold itself as a slide', () => {
    expect(isDragIntent(8, 0)).toBe(true);
  });

  it('reads a finger that has barely moved as no slide', () => {
    expect(isDragIntent(7, 0)).toBe(false);
  });

  it('leaves a downward swipe to the page', () => {
    expect(isDragIntent(10, 40)).toBe(false);
  });

  it('leaves an upward swipe to the page', () => {
    expect(isDragIntent(10, -40)).toBe(false);
  });

  it('leaves a diagonal travelling as far down as across to the page', () => {
    expect(isDragIntent(20, 20)).toBe(false);
  });
});

// @FollowsBlueprint test-pure-unit
describe('levelFromKey', () => {
  it('steps up on the right arrow', () => {
    expect(
      levelFromKey({ key: 'ArrowRight', current: 5, minimum: MINIMUM, maximum: MAXIMUM }),
    ).toBe(6);
  });

  it('steps up on the up arrow', () => {
    expect(levelFromKey({ key: 'ArrowUp', current: 5, minimum: MINIMUM, maximum: MAXIMUM })).toBe(
      6,
    );
  });

  it('steps down on the left arrow', () => {
    expect(levelFromKey({ key: 'ArrowLeft', current: 5, minimum: MINIMUM, maximum: MAXIMUM })).toBe(
      4,
    );
  });

  it('steps down on the down arrow', () => {
    expect(levelFromKey({ key: 'ArrowDown', current: 5, minimum: MINIMUM, maximum: MAXIMUM })).toBe(
      4,
    );
  });

  it('holds at the maximum', () => {
    expect(
      levelFromKey({ key: 'ArrowRight', current: MAXIMUM, minimum: MINIMUM, maximum: MAXIMUM }),
    ).toBe(10);
  });

  it('holds at the minimum', () => {
    expect(
      levelFromKey({ key: 'ArrowLeft', current: MINIMUM, minimum: MINIMUM, maximum: MAXIMUM }),
    ).toBe(1);
  });

  it('jumps to the minimum on Home', () => {
    expect(levelFromKey({ key: 'Home', current: 8, minimum: MINIMUM, maximum: MAXIMUM })).toBe(1);
  });

  it('jumps to the maximum on End', () => {
    expect(levelFromKey({ key: 'End', current: 2, minimum: MINIMUM, maximum: MAXIMUM })).toBe(10);
  });

  it('leaves every other key to the browser', () => {
    expect(levelFromKey({ key: 'Tab', current: 5, minimum: MINIMUM, maximum: MAXIMUM })).toBeNull();
  });
});
