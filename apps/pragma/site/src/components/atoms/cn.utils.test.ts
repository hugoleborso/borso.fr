import { describe, expect, it } from 'vitest';
import { cn } from './cn.utils';

describe('cn', () => {
  it('joins string class names with a space', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy entries', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('flattens conditional objects', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('flattens nested arrays', () => {
    expect(cn(['a', ['b', { c: true }]], 'd')).toBe('a b c d');
  });

  it('returns an empty string when no inputs are truthy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});
