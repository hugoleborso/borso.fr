import { describe, expect, it } from 'vitest';
import { selectMasteryColor } from './mastery-color.core';

// @FollowsBlueprint test-pure-unit
describe('selectMasteryColor', () => {
  it('is neutral for an unscored member', () => {
    expect(selectMasteryColor(null)).toBe('var(--color-ink-400)');
  });

  it('is good from seven upwards', () => {
    expect(selectMasteryColor(7)).toBe('var(--color-good)');
    expect(selectMasteryColor(10)).toBe('var(--color-good)');
  });

  it('warns between five and six', () => {
    expect(selectMasteryColor(5)).toBe('var(--color-warn)');
    expect(selectMasteryColor(6)).toBe('var(--color-warn)');
  });

  it('is a danger below five', () => {
    expect(selectMasteryColor(4)).toBe('var(--color-danger)');
    expect(selectMasteryColor(0)).toBe('var(--color-danger)');
  });
});
