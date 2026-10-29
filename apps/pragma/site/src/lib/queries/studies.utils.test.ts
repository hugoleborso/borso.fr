import { describe, expect, it } from 'vitest';
import { markStudied } from './studies.utils';

const OVERVIEW = {
  today: '2026-10-12',
  queue: [
    { songId: 'song', instrumentId: 'guitar', isStudiedToday: false },
    { songId: 'song', instrumentId: 'voice', isStudiedToday: false },
    { songId: 'other', instrumentId: 'guitar', isStudiedToday: false },
    { songId: 'other', instrumentId: 'voice', isStudiedToday: false },
  ],
};

// @FollowsBlueprint test-pure-unit
describe('studies.utils', () => {
  it('marks only the targeted song and instrument', () => {
    const marked = markStudied(OVERVIEW, { songId: 'song', instrumentId: 'voice' }, true);
    expect(marked.queue.map((row) => row.isStudiedToday)).toEqual([false, true, false, false]);
    expect(marked.today).toBe('2026-10-12');
  });
});
