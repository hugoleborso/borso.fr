import { describe, expect, it } from 'vitest';
import { requireAt } from './require-at.core';

describe('requireAt', () => {
  it('answers the item at an index', () => {
    expect(requireAt(['a', 'b'], 1)).toBe('b');
  });

  it('answers a capture group of a match', () => {
    const match = /^(\w+)-(\w+)$/.exec('weak-point');
    expect(match === null ? null : requireAt(match, 2)).toBe('point');
  });

  it('throws when the index holds nothing, naming the index and the length', () => {
    expect(() => requireAt(['a'], 3)).toThrow(new RangeError('expected an item at index 3 of 1'));
    const match = /^(a)?(b)$/.exec('b');
    expect(() => (match === null ? null : requireAt(match, 1))).toThrow(RangeError);
  });
});
