import { describe, expect, it } from 'vitest';
import { MAXIMUM_BIB, MINIMUM_BIB, PHOTO_CONTENT_TYPES } from './runner-limits.core';

// @FollowsBlueprint test-pure-unit
describe('runner limits', () => {
  it('numbers bibs from one', () => {
    expect(MINIMUM_BIB).toBe(1);
    expect(MAXIMUM_BIB).toBeGreaterThan(MINIMUM_BIB);
  });

  it('accepts the image formats a phone camera produces', () => {
    expect(PHOTO_CONTENT_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });
});
