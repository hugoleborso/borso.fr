import { describe, expect, it } from 'vitest';
import {
  arrangeReorder,
  countSongsBeforeEachBreak,
  mergeSetlistItems,
  placeBreakAfter,
  type SetlistItem,
  selectNextItemPosition,
} from './setlist-break.core';

const SONG_A: SetlistItem = { id: 'a', kind: 'song', position: 0 };
const PAUSE: SetlistItem = { id: 'p', kind: 'break', position: 1 };
const SONG_B: SetlistItem = { id: 'b', kind: 'song', position: 2 };
const SONG_C: SetlistItem = { id: 'c', kind: 'song', position: 3 };
const SET_WITH_PAUSE = [SONG_A, PAUSE, SONG_B, SONG_C];

// @FollowsBlueprint test-pure-unit
describe('mergeSetlistItems', () => {
  it('interleaves songs and breaks by their shared position', () => {
    const merged = mergeSetlistItems(
      [
        { id: 'b', position: 2 },
        { id: 'a', position: 0 },
      ],
      [{ id: 'p', position: 1 }],
    );

    expect(merged).toEqual([SONG_A, PAUSE, { ...SONG_B, position: 2 }]);
  });

  it('breaks a tie on the id, so two readers always agree on the order', () => {
    const merged = mergeSetlistItems(
      [
        { id: 'z', position: 4 },
        { id: 'y', position: 4 },
      ],
      [{ id: 'p', position: 4 }],
    );

    expect(merged.map((item) => item.id)).toEqual(['p', 'y', 'z']);
  });
});

describe('arrangeReorder', () => {
  it('takes an order naming every song and every break as given', () => {
    expect(arrangeReorder(SET_WITH_PAUSE, ['b', 'c', 'p', 'a'])).toEqual(['b', 'c', 'p', 'a']);
  });

  it('keeps every break in its slot when the order names the songs only', () => {
    expect(arrangeReorder(SET_WITH_PAUSE, ['c', 'a', 'b'])).toEqual(['c', 'p', 'a', 'b']);
  });

  it('keeps a leading and a trailing break in their slots', () => {
    const runningOrder: SetlistItem[] = [
      { id: 'p1', kind: 'break', position: 0 },
      SONG_A,
      SONG_B,
      { id: 'p2', kind: 'break', position: 3 },
    ];

    expect(arrangeReorder(runningOrder, ['b', 'a'])).toEqual(['p1', 'b', 'a', 'p2']);
  });

  it('refuses an order that names an unknown id, misses one, or repeats one', () => {
    expect(arrangeReorder(SET_WITH_PAUSE, ['a', 'b', 'x'])).toBeNull();
    expect(arrangeReorder(SET_WITH_PAUSE, ['a', 'b'])).toBeNull();
    expect(arrangeReorder(SET_WITH_PAUSE, ['a', 'a', 'b', 'c'])).toBeNull();
    expect(arrangeReorder(SET_WITH_PAUSE, ['a', 'p', 'b'])).toBeNull();
  });
});

describe('placeBreakAfter', () => {
  it('puts the new break right after its anchor', () => {
    expect(placeBreakAfter(['a', 'b', 'c'], 'b', 'p')).toEqual(['a', 'b', 'p', 'c']);
    expect(placeBreakAfter(['a', 'b'], 'b', 'p')).toEqual(['a', 'b', 'p']);
  });

  it('refuses an anchor that is not in the setlist', () => {
    expect(placeBreakAfter(['a', 'b'], 'x', 'p')).toBeNull();
  });
});

describe('countSongsBeforeEachBreak', () => {
  it('counts the songs played before each break', () => {
    const runningOrder: SetlistItem[] = [
      { id: 'p0', kind: 'break', position: 0 },
      ...SET_WITH_PAUSE,
      { id: 'p9', kind: 'break', position: 9 },
    ];

    expect(Object.fromEntries(countSongsBeforeEachBreak(runningOrder))).toEqual({
      p0: 0,
      p: 1,
      p9: 3,
    });
  });
});

describe('selectNextItemPosition', () => {
  it('starts an empty setlist at zero', () => {
    expect(selectNextItemPosition([])).toBe(0);
  });

  it('goes past the last item, even when a deleted song left a gap', () => {
    expect(selectNextItemPosition([SONG_A, PAUSE, SONG_C])).toBe(4);
  });
});
