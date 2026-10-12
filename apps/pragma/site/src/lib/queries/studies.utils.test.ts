import { describe, expect, it } from 'vitest';
import {
  keepPinnedOrder,
  markStudied,
  readRowScore,
  settleOwnLine,
  targetKey,
  withRowScore,
} from './studies.utils';

const OVERVIEW = {
  today: '2026-10-12',
  myStreak: { days: 1 },
  queue: [
    { songId: 'song', instrumentId: 'guitar', isStudiedToday: false },
    { songId: 'song', instrumentId: 'voice', isStudiedToday: false },
    { songId: 'other', instrumentId: 'guitar', isStudiedToday: false },
    { songId: 'other', instrumentId: 'voice', isStudiedToday: false },
  ],
  band: [
    { memberId: 'me', streak: { days: 1 }, studiesThisWeek: 1 },
    { memberId: 'lea', streak: { days: 4 }, studiesThisWeek: 6 },
  ],
};

// @FollowsBlueprint test-pure-unit
describe('studies.utils', () => {
  it('marks only the targeted song and instrument', () => {
    const marked = markStudied(OVERVIEW, { songId: 'song', instrumentId: 'voice' }, true);
    expect(marked.queue.map((row) => row.isStudiedToday)).toEqual([false, true, false, false]);
    expect(marked.today).toBe('2026-10-12');
  });

  it('writes my streak and weekly count in the header and in my band line only', () => {
    const settled = settleOwnLine(OVERVIEW, 'me', { streak: { days: 2 }, studiesThisWeek: 3 });
    expect(settled.myStreak).toEqual({ days: 2 });
    expect(settled.band).toEqual([
      { memberId: 'me', streak: { days: 2 }, studiesThisWeek: 3 },
      { memberId: 'lea', streak: { days: 4 }, studiesThisWeek: 6 },
    ]);
  });

  it('keeps the pinned order and puts rows it has never seen last', () => {
    const rows = [
      { songId: 'b', instrumentId: 'x' },
      { songId: 'new', instrumentId: 'x' },
      { songId: 'a', instrumentId: 'x' },
    ];
    const pinned = [
      targetKey({ songId: 'a', instrumentId: 'x' }),
      targetKey({ songId: 'b', instrumentId: 'x' }),
    ];
    expect(keepPinnedOrder(rows, pinned).map((row) => row.songId)).toEqual(['a', 'b', 'new']);
  });

  it('reads and writes the score of one row only', () => {
    const overview = {
      queue: [
        { songId: 'song', instrumentId: 'guitar', score: 4 },
        { songId: 'song', instrumentId: 'voice', score: null },
        { songId: 'other', instrumentId: 'guitar', score: 2 },
      ],
    };
    const target = { songId: 'song', instrumentId: 'guitar' };
    expect(readRowScore(overview.queue, target)).toBe(4);
    expect(readRowScore(overview.queue, { songId: 'song', instrumentId: 'voice' })).toBeNull();
    expect(readRowScore(overview.queue, { songId: 'missing', instrumentId: 'guitar' })).toBeNull();
    expect(withRowScore(overview, target, 5).queue.map((row) => row.score)).toEqual([5, null, 2]);
  });

  it('restores a fully pinned order from any arrival order', () => {
    const pinned = ['a', 'b', 'c'].map((songId) => targetKey({ songId, instrumentId: 'x' }));
    const rows = ['c', 'b', 'a'].map((songId) => ({ songId, instrumentId: 'x' }));
    expect(keepPinnedOrder(rows, pinned).map((row) => row.songId)).toEqual(['a', 'b', 'c']);
  });
});
