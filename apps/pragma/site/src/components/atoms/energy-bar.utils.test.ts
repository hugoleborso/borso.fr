import { describe, expect, it } from 'vitest';
import { buildEnergyLevels, levelFromKey } from './energy-bar.utils';

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
