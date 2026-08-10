import { describe, expect, it } from 'vitest';
import { isPositiveCount } from './counts.utils';

describe('isPositiveCount', () => {
  it('accepts a count with something in it', () => {
    expect(isPositiveCount(1)).toBe(true);
    expect(isPositiveCount(42)).toBe(true);
  });

  it('rejects an empty count', () => {
    expect(isPositiveCount(0)).toBe(false);
  });

  it('reads a count nobody computed as empty', () => {
    expect(isPositiveCount(undefined)).toBe(false);
  });
});
