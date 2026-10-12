import { describe, expect, it } from 'vitest';
import { composeClassName } from './class-name.utils';

describe('composeClassName', () => {
  it('joins the truthy class names and drops the falsy ones', () => {
    expect(composeClassName('a', false, undefined, 'b', { c: true, d: false })).toBe('a b c');
  });

  it('keeps the last of two classes that set the same property', () => {
    expect(composeClassName('w-full px-3', 'w-12')).toBe('px-3 w-12');
  });
});
