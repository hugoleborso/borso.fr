import { describe, expect, it } from 'vitest';
import {
  CLOSENESS_SCALE,
  findClosenessScore,
  HIGHEST_CLOSENESS,
  LOWEST_CLOSENESS,
  PERSON_KIND,
} from './closeness.core';

// @FollowsBlueprint test-pure-unit
describe('the closeness scale', () => {
  it('runs from 0 to 5, one score per integer, and names the kind of a person', () => {
    expect(CLOSENESS_SCALE).toStrictEqual([0, 1, 2, 3, 4, 5]);
    expect(LOWEST_CLOSENESS).toBe(0);
    expect(HIGHEST_CLOSENESS).toBe(5);
    expect(PERSON_KIND).toBe('personne');
  });
});

describe('findClosenessScore', () => {
  it.each([0, 1, 2, 3, 4, 5])(
    'finds the score %i, as a number and as the text of a page',
    (score) => {
      expect(findClosenessScore(score)).toBe(score);
      expect(findClosenessScore(String(score))).toBe(score);
    },
  );

  it.each([null, 6, -1, 2.5, Number.NaN, '', '04', 'proche', 'constructor'])(
    'finds no score in %s, which is outside the scale',
    (value) => {
      expect(findClosenessScore(value)).toBeNull();
    },
  );
});
