import { describe, expect, it } from 'vitest';
import { selectStaleQueryRoots } from './query-read-roots.core';

const TABLE = {
  studies: ['studies', 'mastery'],
  setlists: ['setlists'],
  voting: ['setlists'],
  songs: ['songs'],
  uploads: [],
} as const;

// @FollowsBlueprint test-pure-unit
describe('selectStaleQueryRoots', () => {
  it('names every query root that reads a written root, directly or through a derived read', () => {
    expect(selectStaleQueryRoots(['setlists'], TABLE)).toStrictEqual([
      'studies',
      'setlists',
      'voting',
    ]);
    expect(selectStaleQueryRoots(['mastery'], TABLE)).toStrictEqual(['studies']);
  });

  it('names a query root once, however many written roots it reads', () => {
    expect(selectStaleQueryRoots(['songs', 'setlists'], TABLE)).toStrictEqual([
      'studies',
      'setlists',
      'voting',
      'songs',
    ]);
  });

  it('names no query root for a written root nothing reads, nor for no written root', () => {
    expect(selectStaleQueryRoots(['outreach'], TABLE)).toStrictEqual([]);
    expect(selectStaleQueryRoots([], TABLE)).toStrictEqual([]);
  });

  it('makes everything stale once one written root is all', () => {
    expect(selectStaleQueryRoots(['tasks', 'all'], TABLE)).toBe('all');
  });

  it('reads the application table when no table is passed', () => {
    expect(selectStaleQueryRoots(['mastery'])).toStrictEqual(['mastery', 'streaks', 'studies']);
    expect(selectStaleQueryRoots(['outreach'])).toStrictEqual(['outreach']);
  });

  it('refreshes only the profile, the members list and free slots after a contact or calendar write', () => {
    expect(selectStaleQueryRoots(['me'])).toStrictEqual(['free-slots', 'me', 'members']);
  });
});
