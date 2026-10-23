import { describe, expect, it } from 'vitest';
import {
  isMomentToggleOnByDefault,
  orderThread,
  placeMomentMarks,
  isMomentToggleOn,
  selectCommentMoment,
} from './take-player.core';

// @FollowsBlueprint test-pure-unit
describe('isMomentToggleOnByDefault', () => {
  it('is on while the player is paused past zero', () => {
    expect(isMomentToggleOnByDefault(true, 102)).toBe(true);
  });

  it('is off while playing, and off at the very start', () => {
    expect(isMomentToggleOnByDefault(false, 102)).toBe(false);
    expect(isMomentToggleOnByDefault(true, 0)).toBe(false);
  });
});

describe('isMomentToggleOn', () => {
  it('follows the player until the member chooses', () => {
    expect(isMomentToggleOn(null, true, 102)).toBe(true);
    expect(isMomentToggleOn(null, false, 102)).toBe(false);
  });

  it('keeps the member choice over the player', () => {
    expect(isMomentToggleOn(false, true, 102)).toBe(false);
    expect(isMomentToggleOn(true, false, 0)).toBe(true);
  });
});

describe('selectCommentMoment', () => {
  it('pins the comment at the whole second the player shows', () => {
    expect(selectCommentMoment(true, 102.9, 245)).toBe(102);
  });

  it('never pins past the end of the take', () => {
    expect(selectCommentMoment(true, 246.5, 245)).toBe(245);
  });

  it('pins nothing with the toggle off', () => {
    expect(selectCommentMoment(false, 102, 245)).toBeNull();
  });
});

describe('placeMomentMarks', () => {
  const COMMENTS = [
    { id: 'a', atSeconds: 50, createdAt: '2026-10-23T10:00:00.000Z' },
    { id: 'b', atSeconds: null, createdAt: '2026-10-23T10:01:00.000Z' },
    { id: 'c', atSeconds: 300, createdAt: '2026-10-23T10:02:00.000Z' },
    { id: 'd', atSeconds: 0, createdAt: '2026-10-23T10:03:00.000Z' },
  ];

  it('marks each pinned comment at its share of the take, the free ones nowhere', () => {
    expect(placeMomentMarks(COMMENTS, 200)).toEqual([
      { id: 'a', atSeconds: 50, offsetPercent: 25 },
      { id: 'c', atSeconds: 300, offsetPercent: 100 },
      { id: 'd', atSeconds: 0, offsetPercent: 0 },
    ]);
  });

  it('marks nothing on a take whose length is unknown', () => {
    expect(placeMomentMarks(COMMENTS, 0)).toEqual([]);
  });
});

describe('orderThread', () => {
  it('mixes both kinds of comment in the order they were written', () => {
    const later = { id: 'a', atSeconds: 10, createdAt: '2026-10-23T10:05:00.000Z' };
    const earlier = { id: 'b', atSeconds: null, createdAt: '2026-10-23T10:00:00.000Z' };
    const sameTime = { id: 'c', atSeconds: null, createdAt: '2026-10-23T10:05:00.000Z' };
    expect(orderThread([sameTime, later, earlier]).map((comment) => comment.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });
});
