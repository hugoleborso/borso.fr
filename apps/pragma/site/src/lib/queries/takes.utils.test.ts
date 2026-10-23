import { describe, expect, it } from 'vitest';
import {
  appendCommentOnce,
  compareTakesNewestFirst,
  insertTakeNewestFirst,
  removeCommentById,
  removeTakeById,
  shiftCommentCount,
} from './takes.utils';

const OCTOBER_18 = { id: 'b', recordedAt: '2026-10-18T18:00:00.000Z', commentCount: 2 };
const OCTOBER_14 = { id: 'c', recordedAt: '2026-10-14T18:00:00.000Z', commentCount: 0 };
const OCTOBER_2 = { id: 'd', recordedAt: '2026-10-02T18:00:00.000Z', commentCount: 1 };

// @FollowsBlueprint test-pure-unit
describe('compareTakesNewestFirst', () => {
  it('puts the latest recording first', () => {
    expect(compareTakesNewestFirst(OCTOBER_18, OCTOBER_14)).toBeLessThan(0);
    expect(compareTakesNewestFirst(OCTOBER_14, OCTOBER_18)).toBeGreaterThan(0);
  });

  it('breaks a tie on the recording time by identifier, descending', () => {
    const sameTime = { ...OCTOBER_18, id: 'a' };
    expect(compareTakesNewestFirst(OCTOBER_18, sameTime)).toBeLessThan(0);
    expect(compareTakesNewestFirst(sameTime, OCTOBER_18)).toBeGreaterThan(0);
    expect(compareTakesNewestFirst(OCTOBER_18, OCTOBER_18)).toBe(0);
  });
});

describe('insertTakeNewestFirst', () => {
  it('places a late upload where it was recorded', () => {
    expect(insertTakeNewestFirst([OCTOBER_18, OCTOBER_2], OCTOBER_14)).toEqual([
      OCTOBER_18,
      OCTOBER_14,
      OCTOBER_2,
    ]);
  });

  it('replaces a take already listed under the same identifier', () => {
    const renamed = { ...OCTOBER_14, commentCount: 5 };
    expect(insertTakeNewestFirst([OCTOBER_18, OCTOBER_14], renamed)).toEqual([OCTOBER_18, renamed]);
  });
});

describe('removeTakeById', () => {
  it('drops only the named take', () => {
    expect(removeTakeById([OCTOBER_18, OCTOBER_14], 'b')).toEqual([OCTOBER_14]);
  });
});

describe('shiftCommentCount', () => {
  it('moves the count of the named take only', () => {
    expect(shiftCommentCount([OCTOBER_18, OCTOBER_14], 'c', 1)).toEqual([
      OCTOBER_18,
      { ...OCTOBER_14, commentCount: 1 },
    ]);
  });

  it('never goes below zero', () => {
    expect(shiftCommentCount([OCTOBER_14], 'c', -1)).toEqual([OCTOBER_14]);
  });
});

describe('comment lists', () => {
  it('appends a comment once', () => {
    expect(appendCommentOnce([{ id: 'x' }], { id: 'y' })).toEqual([{ id: 'x' }, { id: 'y' }]);
    expect(appendCommentOnce([{ id: 'x' }, { id: 'y' }], { id: 'x' })).toEqual([
      { id: 'y' },
      { id: 'x' },
    ]);
  });

  it('removes the named comment', () => {
    expect(removeCommentById([{ id: 'x' }, { id: 'y' }], 'x')).toEqual([{ id: 'y' }]);
  });
});
