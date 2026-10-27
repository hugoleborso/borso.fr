import { describe, expect, it } from 'vitest';
import { selectMasteryTextClass } from './mastery-color.core';

// @FollowsBlueprint test-pure-unit
describe('selectMasteryTextClass', () => {
  it('is neutral for an unscored member', () => {
    expect(selectMasteryTextClass(null)).toBe('text-ink-faint');
  });

  it('is good from seven upwards', () => {
    expect(selectMasteryTextClass(7)).toBe('text-good');
    expect(selectMasteryTextClass(10)).toBe('text-good');
  });

  it('warns between five and six', () => {
    expect(selectMasteryTextClass(5)).toBe('text-warn');
    expect(selectMasteryTextClass(6)).toBe('text-warn');
  });

  it('is a danger below five', () => {
    expect(selectMasteryTextClass(4)).toBe('text-danger');
    expect(selectMasteryTextClass(0)).toBe('text-danger');
  });
});
