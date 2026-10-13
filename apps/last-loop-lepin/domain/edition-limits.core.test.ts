import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INTERVAL_MINUTES,
  MAXIMUM_EDITION_SLUG_LENGTH,
  MAXIMUM_INTERVAL_MINUTES,
  MINIMUM_EDITION_SLUG_LENGTH,
  MINIMUM_INTERVAL_MINUTES,
  SLUG_CHARACTERS_PATTERN,
} from './edition-limits.core';

// @FollowsBlueprint test-pure-unit
describe('edition limits', () => {
  it('starts a new edition on an interval the form and the API both accept', () => {
    expect(DEFAULT_INTERVAL_MINUTES).toBeGreaterThanOrEqual(MINIMUM_INTERVAL_MINUTES);
    expect(DEFAULT_INTERVAL_MINUTES).toBeLessThanOrEqual(MAXIMUM_INTERVAL_MINUTES);
  });

  it('leaves room between the shortest and the longest slug', () => {
    expect(MINIMUM_EDITION_SLUG_LENGTH).toBeLessThan(MAXIMUM_EDITION_SLUG_LENGTH);
  });

  it('accepts lowercase letters, digits and dashes in a slug and nothing else', () => {
    expect(SLUG_CHARACTERS_PATTERN.test('lepin-2026')).toBe(true);
    expect(SLUG_CHARACTERS_PATTERN.test('Lepin 2026')).toBe(false);
  });
});
