import { describe, expect, it } from 'vitest';
import { composeClassName } from './class-name.utils';

// @FollowsBlueprint test-pure-unit
describe('composeClassName', () => {
  it('joins string class names with a space', () => {
    expect(composeClassName('a', 'b')).toBe('a b');
  });

  it('drops falsy entries', () => {
    expect(composeClassName('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('flattens conditional objects', () => {
    expect(composeClassName('base', { active: true, disabled: false })).toBe('base active');
  });

  it('flattens nested arrays', () => {
    expect(composeClassName(['a', ['b', { c: true }]], 'd')).toBe('a b c d');
  });

  it('returns an empty string when no inputs are truthy', () => {
    expect(composeClassName(false, null, undefined)).toBe('');
  });
});
