import { describe, expect, it } from 'vitest';
import {
  buildBrushUpTask,
  selectSessionToBrushUp,
  indexBrushUpTasksBySong,
  type BrushUpTask,
} from './brush-up.core';

function task(overrides: Partial<BrushUpTask>): BrushUpTask {
  return {
    id: 'task',
    status: 'todo',
    assigneeId: 'anna',
    songId: 'song-a',
    sessionId: 'next',
    ...overrides,
  };
}

describe('indexBrushUpTasksBySong', () => {
  it('groups the tasks of the next session by song, done ones included', () => {
    const first = task({ id: 'first' });
    const second = task({ id: 'second', assigneeId: 'bruno', status: 'done' });
    const otherSong = task({ id: 'other', songId: 'song-b' });
    const index = indexBrushUpTasksBySong([first, second, otherSong], 'next');
    expect(index.get('song-a')).toEqual([first, second]);
    expect(index.get('song-b')).toEqual([otherSong]);
  });

  it('leaves out tasks of another session and tasks about no song', () => {
    const index = indexBrushUpTasksBySong(
      [task({ sessionId: 'later' }), task({ songId: null }), task({ sessionId: null })],
      'next',
    );
    expect(index.size).toBe(0);
  });

  it('holds nothing when there is no next session', () => {
    expect(indexBrushUpTasksBySong([task({ sessionId: null })], null).size).toBe(0);
  });
});

describe('selectSessionToBrushUp', () => {
  const NEXT = { id: 'next', date: '2026-11-18T19:00:00+01:00' };

  it('offers the next session when the member has no task on the song for it', () => {
    expect(selectSessionToBrushUp([task({ assigneeId: 'bruno' })], 'anna', NEXT)).toBe(NEXT);
  });

  it('offers nothing once the member has one, even ticked and beside another member’s', () => {
    const tasks = [task({ assigneeId: 'bruno' }), task({ status: 'done' })];
    expect(selectSessionToBrushUp(tasks, 'anna', NEXT)).toBeNull();
  });

  it('offers nothing while the task list has not arrived', () => {
    expect(selectSessionToBrushUp(null, 'anna', NEXT)).toBeNull();
  });

  it('offers nothing with no next session or no signed-in member', () => {
    expect(selectSessionToBrushUp([], 'anna', null)).toBeNull();
    expect(selectSessionToBrushUp([], null, NEXT)).toBeNull();
  });
});

describe('buildBrushUpTask', () => {
  it('assigns the member and dates the task on the session', () => {
    expect(
      buildBrushUpTask({
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
