import { describe, expect, it } from 'vitest';
import {
  CAPO_MAX,
  CAPO_MIN,
  ENERGY_MAX,
  ENERGY_MIN,
  MASTERY_SCORE_MAX,
  MASTERY_SCORE_MIN,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from './input-limits.core';

// @FollowsBlueprint test-pure-unit
describe('input limits', () => {
  it('leaves room between every lower and upper bound', () => {
    expect(USERNAME_MIN_LENGTH).toBeLessThan(USERNAME_MAX_LENGTH);
    expect(PASSWORD_MIN_LENGTH).toBeLessThan(PASSWORD_MAX_LENGTH);
    expect(ENERGY_MIN).toBeLessThan(ENERGY_MAX);
    expect(CAPO_MIN).toBeLessThan(CAPO_MAX);
    expect(MASTERY_SCORE_MIN).toBeLessThan(MASTERY_SCORE_MAX);
  });

  it('lets a capo sit on any fret short of the octave', () => {
    expect(CAPO_MIN).toBe(0);
    expect(CAPO_MAX).toBe(11);
  });
});
