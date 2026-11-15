import { describe, expect, it } from 'vitest';
import {
  buildRevisionTask,
  selectSessionToRevise,
  indexRevisionTasksBySong,
  type RevisionTask,
} from './song-revision.core';

function task(overrides: Partial<RevisionTask>): RevisionTask {
  return {
    id: 'task',
    status: 'todo',
    assigneeId: 'anna',
    songId: 'song-a',
    sessionId: 'next',
    ...overrides,
  };
}

describe('indexRevisionTasksBySong', () => {
  it('groups the tasks of the next session by song, done ones included', () => {
    const first = task({ id: 'first' });
    const second = task({ id: 'second', assigneeId: 'bruno', status: 'done' });
    const otherSong = task({ id: 'other', songId: 'song-b' });
    const index = indexRevisionTasksBySong([first, second, otherSong], 'next');
    expect(index.get('song-a')).toEqual([first, second]);
    expect(index.get('song-b')).toEqual([otherSong]);
  });

  it('leaves out tasks of another session and tasks about no song', () => {
    const index = indexRevisionTasksBySong(
      [task({ sessionId: 'later' }), task({ songId: null }), task({ sessionId: null })],
      'next',
    );
    expect(index.size).toBe(0);
  });

  it('holds nothing when there is no next session', () => {
    expect(indexRevisionTasksBySong([task({ sessionId: null })], null).size).toBe(0);
  });
});

describe('selectSessionToRevise', () => {
  const NEXT = { id: 'next', date: '2026-11-18T19:00:00+01:00' };

  it('offers the next session when the member has no task on the song for it', () => {
    expect(selectSessionToRevise([task({ assigneeId: 'bruno' })], 'anna', NEXT)).toBe(NEXT);
  });

  it('offers nothing once the member has one, even ticked', () => {
    expect(selectSessionToRevise([task({ status: 'done' })], 'anna', NEXT)).toBeNull();
  });

  it('offers nothing with no next session or no signed-in member', () => {
    expect(selectSessionToRevise([], 'anna', null)).toBeNull();
    expect(selectSessionToRevise([], null, NEXT)).toBeNull();
  });
});

describe('buildRevisionTask', () => {
  it('assigns the member and dates the task on the session', () => {
    expect(
      buildRevisionTask({
        title: 'Revise Roxanne',
        memberId: 'anna',
        songId: 'song-a',
        session: { id: 'next', date: '2026-11-18T19:00:00+01:00' },
      }),
    ).toEqual({
      title: 'Revise Roxanne',
      assigneeId: 'anna',
      songId: 'song-a',
      sessionId: 'next',
      dueDate: '2026-11-18T18:00:00.000Z',
    });
  });
});
