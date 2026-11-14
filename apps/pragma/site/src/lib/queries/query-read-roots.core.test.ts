import { describe, expect, it } from 'vitest';
import { selectQueryRootsDerivedFrom, selectStaleQueryRoots } from './query-read-roots.core';

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

describe('selectQueryRootsDerivedFrom', () => {
  it('names every other query root that reads the written root, leaving the writer its own', () => {
    expect(selectQueryRootsDerivedFrom('setlists', 'setlists', TABLE)).toStrictEqual([
      'studies',
      'voting',
    ]);
    expect(selectQueryRootsDerivedFrom('outreach', 'setlists', TABLE)).toStrictEqual([]);
  });

  it('makes the inspirations stale after a member write, since a card names its author', () => {
    expect(selectQueryRootsDerivedFrom('members', 'members')).toContain('inspirations');
    expect(selectQueryRootsDerivedFrom('members', 'members')).not.toContain('members');
  });
});
