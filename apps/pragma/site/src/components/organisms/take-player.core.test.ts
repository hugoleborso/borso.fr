import { describe, expect, it } from 'vitest';
import {
  type MomentMark,
  isMomentToggleOnByDefault,
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

function readPlacement(marks: readonly MomentMark[]): [string, number, number][] {
  return marks.map((mark) => [mark.id, mark.atSeconds, mark.offsetPercent]);
}

describe('placeMomentMarks', () => {
  const COMMENTS = [
    { id: 'late', atSeconds: 80 },
    { id: 'free', atSeconds: null },
    { id: 'early', atSeconds: 20 },
    { id: 'same-second-as-late', atSeconds: 80 },
    { id: 'start', atSeconds: 0 },
  ];

  it('marks each pinned second once, in time order, the free comments nowhere', () => {
    expect(readPlacement(placeMomentMarks(COMMENTS, 200))).toEqual([
      ['start', 0, 0],
      ['early', 20, 10],
      ['late', 80, 40],
    ]);
  });

  it('gives a tap between two marks to the nearer one, splitting the track halfway', () => {
    const [start, early, late] = placeMomentMarks(COMMENTS, 200);
    expect([start?.reachEndPercent, early?.reachStartPercent]).toEqual([5, 5]);
    expect([early?.reachEndPercent, late?.reachStartPercent]).toEqual([25, 25]);
  });

  it('lets the first and last marks reach past the ends of the track', () => {
    const marks = placeMomentMarks(COMMENTS, 200);
    expect(marks[0]?.reachStartPercent).toBe(-100);
    expect(marks.at(-1)?.reachEndPercent).toBe(200);
  });

  it('places each mark inside its own reach', () => {
    const [start, early, late] = placeMomentMarks(COMMENTS, 200);
    expect(start?.offsetInReachPercent).toBeCloseTo((100 / 105) * 100);
    expect(early?.offsetInReachPercent).toBe(25);
    expect(late?.offsetInReachPercent).toBeCloseTo((15 / 175) * 100);
  });

  it('reaches the whole track either side of a lone mark', () => {
    expect(placeMomentMarks([{ id: 'only', atSeconds: 50 }], 100)).toEqual([
      {
        id: 'only',
        atSeconds: 50,
        offsetPercent: 50,
        reachStartPercent: -100,
        reachEndPercent: 200,
        offsetInReachPercent: 50,
      },
    ]);
  });

  it('never marks past the end of the take', () => {
    expect(readPlacement(placeMomentMarks([{ id: 'after', atSeconds: 300 }], 200))).toEqual([
      ['after', 200, 100],
    ]);
  });

  it('marks nothing on a take whose length is unknown', () => {
    expect(placeMomentMarks(COMMENTS, 0)).toEqual([]);
  });
});
