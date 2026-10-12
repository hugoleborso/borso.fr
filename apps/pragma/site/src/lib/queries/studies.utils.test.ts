import { describe, expect, it } from 'vitest';
import { markStudied, settleOwnStreak } from './studies.utils';

const OVERVIEW = {
  today: '2026-10-12',
  myStreak: { days: 1 },
  queue: [
    { songId: 'song', instrumentId: 'guitar', isStudiedToday: false },
    { songId: 'song', instrumentId: 'voice', isStudiedToday: false },
    { songId: 'other', instrumentId: 'guitar', isStudiedToday: false },
  ],
  band: [
    { memberId: 'me', streak: { days: 1 } },
    { memberId: 'lea', streak: { days: 4 } },
  ],
};

// @FollowsBlueprint test-pure-unit
describe('studies.utils', () => {
  it('marks only the targeted song and instrument', () => {
    const marked = markStudied(OVERVIEW, { songId: 'song', instrumentId: 'voice' }, true);
    expect(marked.queue.map((row) => row.isStudiedToday)).toEqual([false, true, false]);
    expect(marked.today).toBe('2026-10-12');
  });

  it('writes my streak in the header and in my band line only', () => {
    const settled = settleOwnStreak(OVERVIEW, 'me', { days: 2 });
    expect(settled.myStreak).toEqual({ days: 2 });
    expect(settled.band).toEqual([
      { memberId: 'me', streak: { days: 2 } },
      { memberId: 'lea', streak: { days: 4 } },
    ]);
  });
});
