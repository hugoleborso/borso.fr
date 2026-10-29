import { describe, expect, it } from 'vitest';
import {
  isSelfReference,
  keepGivenLinks,
  projectTasksForTool,
  type ToolTask,
} from './task-tool.core';

const MEMBERS = [{ id: 'member-lea', name: 'Léa' }];
const SONGS = [{ id: 'song-creep', name: 'Creep' }];
const VAN: ToolTask = {
  id: 'task-van',
  title: 'Book the van',
  notes: '',
  status: 'todo',
  assigneeId: 'member-lea',
  songId: null,
  dueDate: new Date('2026-11-01T10:00:00.000Z'),
};
const BRIDGE: ToolTask = {
  id: 'task-bridge',
  title: 'Rewrite the bridge',
  notes: 'Too early',
  status: 'doing',
  assigneeId: null,
  songId: 'song-creep',
  dueDate: null,
};

function keep(filter: Parameters<typeof projectTasksForTool>[3]): string[] {
  return projectTasksForTool([VAN, BRIDGE], MEMBERS, SONGS, filter).map((task) => task.id);
}

// @FollowsBlueprint test-pure-unit
describe('projectTasksForTool', () => {
  it('names the assignee and the song, and writes the due date as an ISO string', () => {
    expect(projectTasksForTool([VAN, BRIDGE], MEMBERS, SONGS, {})).toEqual([
      {
        id: 'task-van',
        title: 'Book the van',
        status: 'todo',
        due: '2026-11-01T10:00:00.000Z',
        assignee: 'Léa',
        song: null,
        notes: '',
      },
      {
        id: 'task-bridge',
        title: 'Rewrite the bridge',
        status: 'doing',
        due: null,
        assignee: null,
        song: 'Creep',
        notes: 'Too early',
      },
    ]);
  });

  it('keeps the tasks of one assignee, one song or one status', () => {
    expect(keep({ assigneeId: 'member-lea' })).toEqual(['task-van']);
    expect(keep({ songId: 'song-creep' })).toEqual(['task-bridge']);
    expect(keep({ status: 'doing' })).toEqual(['task-bridge']);
    expect(keep({ status: 'done' })).toEqual([]);
  });
});

describe('isSelfReference', () => {
  it('reads `me` in any case and spacing as the member acting', () => {
    expect(isSelfReference(' Me ')).toBe(true);
    expect(isSelfReference('Mehdi')).toBe(false);
  });
});

describe('keepGivenLinks', () => {
  it('keeps a link given, null included, and leaves out one that was not', () => {
    expect(keepGivenLinks('member-lea', undefined)).toStrictEqual({ assigneeId: 'member-lea' });
    expect(keepGivenLinks(undefined, null)).toStrictEqual({ songId: null });
    expect(keepGivenLinks(undefined, undefined)).toStrictEqual({});
  });
});
