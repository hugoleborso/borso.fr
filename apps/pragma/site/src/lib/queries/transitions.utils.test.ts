import { describe, expect, it } from 'vitest';
import { upsertTransitionComment } from './transitions.utils';

const FIRST = { songAId: 'a', songBId: 'b', comment: 'segue', updatedAt: '2026-01-01T00:00:00Z' };
const SECOND = { songAId: 'b', songBId: 'c', comment: 'stop', updatedAt: '2026-01-01T00:00:00Z' };

// @FollowsBlueprint test-pure-unit
describe('upsertTransitionComment', () => {
  it('replaces the comment already held for that pair', () => {
    const next = { ...FIRST, comment: 'straight in' };

    expect(upsertTransitionComment([FIRST, SECOND], next)).toStrictEqual([next, SECOND]);
  });

  it('appends a pair the list does not hold yet', () => {
    expect(upsertTransitionComment([FIRST], SECOND)).toStrictEqual([FIRST, SECOND]);
  });

  it('does not match a pair that shares only its first song', () => {
    const sharesFirst = { ...FIRST, songBId: 'z', comment: 'into z' };

    expect(upsertTransitionComment([FIRST], sharesFirst)).toStrictEqual([FIRST, sharesFirst]);
  });

  it('does not match a pair that shares only its second song', () => {
    const sharesSecond = { ...FIRST, songAId: 'z', comment: 'from z' };

    expect(upsertTransitionComment([FIRST], sharesSecond)).toStrictEqual([FIRST, sharesSecond]);
  });

  it('treats the reversed pair as a different transition', () => {
    const reversed = { ...FIRST, songAId: 'b', songBId: 'a', comment: 'other way' };

    expect(upsertTransitionComment([FIRST], reversed)).toStrictEqual([FIRST, reversed]);
  });

  it('appends into an empty list', () => {
    expect(upsertTransitionComment([], FIRST)).toStrictEqual([FIRST]);
  });
});
