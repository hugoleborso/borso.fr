import { describe, expect, it } from 'vitest';
import {
  buildStaleMessage,
  EVERY_WRITTEN_ROOT,
  expandReadRoots,
  isReadMethod,
  isWrittenRoot,
  WRITTEN_API_ROOTS,
} from './stale-scope.core';

// @FollowsBlueprint test-pure-unit
describe('written roots', () => {
  it('recognises every API root a write announces and the root covering everything', () => {
    expect([...WRITTEN_API_ROOTS, EVERY_WRITTEN_ROOT].every(isWrittenRoot)).toBe(true);
    expect(isWrittenRoot('all')).toBe(true);
  });

  it('refuses a root no announced write touches', () => {
    expect(isWrittenRoot('auth')).toBe(false);
    expect(isWrittenRoot('streaks')).toBe(false);
    expect(isWrittenRoot('')).toBe(false);
  });

  it('refuses a value that is not a string', () => {
    expect(isWrittenRoot(null)).toBe(false);
    expect(isWrittenRoot(['setlists'])).toBe(false);
  });

  it('wraps the written roots in the message the socket carries', () => {
    expect(buildStaleMessage(['setlists', 'mastery'])).toStrictEqual({
      kind: 'stale',
      written: ['setlists', 'mastery'],
    });
  });
});

describe('isReadMethod', () => {
  it('treats only the methods that change nothing as reads, whatever their case', () => {
    expect(isReadMethod('get')).toBe(true);
    expect(isReadMethod('HEAD')).toBe(true);
    expect(isReadMethod('OPTIONS')).toBe(true);
    expect(isReadMethod('POST')).toBe(false);
    expect(isReadMethod('PATCH')).toBe(false);
    expect(isReadMethod('DELETE')).toBe(false);
  });
});

describe('expandReadRoots', () => {
  it('adds every root a derived read aggregates, and the roots those aggregate in turn', () => {
    const derived = { studies: ['streaks'], streaks: ['sessions'] } as const;
    expect([...expandReadRoots(['studies'], derived)]).toStrictEqual([
      'studies',
      'streaks',
      'sessions',
    ]);
  });

  it('keeps a root no row names as itself alone', () => {
    expect([...expandReadRoots(['tasks'], {})]).toStrictEqual(['tasks']);
    expect([...expandReadRoots([], {})]).toStrictEqual([]);
  });

  it('stops on a cycle between two derived reads', () => {
    const derived = { studies: ['streaks'], streaks: ['studies'] } as const;
    expect([...expandReadRoots(['streaks'], derived)]).toStrictEqual(['streaks', 'studies']);
  });

  it('reads the application table when no table is passed, so the studies overview hears a setlist write', () => {
    expect(expandReadRoots(['studies']).has('setlists')).toBe(true);
    expect(expandReadRoots(['me']).has('setlists')).toBe(false);
  });
});
