import { describe, expect, it } from 'vitest';
import {
  BLANK_TASK_FORM,
  findSongTitle,
  formValuesFromTask,
  payloadFromFormValues,
  selectFormAfterDeletion,
  toDateInputValue,
  toIsoDueDate,
  groupTasksByMember,
  type MemberShape,
  selectTasksOfSong,
  type TaskShape,
  UNASSIGNED_COLUMN_COLOR,
} from './tasks-page.core';

const MEMBERS: readonly MemberShape[] = [
  { id: 'member-1', firstName: 'Alma', color: '#e07a5f' },
  { id: 'member-2', firstName: 'Bo', color: '#81b29a' },
];

function task(overrides: Partial<TaskShape> = {}): TaskShape {
  return {
    id: 'task-1',
    title: 'Buy strings',
    notes: '',
    status: 'todo',
    assigneeId: null,
    songId: null,
    dueDate: null,
    ...overrides,
  };
}

// @FollowsBlueprint test-pure-unit
describe('groupTasksByMember', () => {
  it('gives every member a column, empty ones included', () => {
    const groups = groupTasksByMember(
      [task({ id: 'a', assigneeId: 'member-1' })],
      MEMBERS,
      'Unassigned',
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.memberName).toBe('Alma');
    expect(groups[0]?.tasks.map((entry) => entry.id)).toEqual(['a']);
    expect(groups[1]?.memberName).toBe('Bo');
    expect(groups[1]?.tasks).toEqual([]);
  });

  it('counts only what is still open', () => {
    const groups = groupTasksByMember(
      [
        task({ id: 'a', assigneeId: 'member-1', status: 'done' }),
        task({ id: 'b', assigneeId: 'member-1', status: 'doing' }),
      ],
      MEMBERS,
      'Unassigned',
    );

    expect(groups[0]?.openCount).toBe(1);
  });

  it('adds the unassigned column only when something is unassigned', () => {
    expect(
      groupTasksByMember([task({ assigneeId: 'member-2' })], MEMBERS, 'Unassigned'),
    ).toHaveLength(2);

    const withOrphan = groupTasksByMember([task({ id: 'orphan' })], MEMBERS, 'Unassigned');
    expect(withOrphan).toHaveLength(3);
    expect(withOrphan[2]).toMatchObject({
      memberId: null,
      memberName: 'Unassigned',
      memberColor: UNASSIGNED_COLUMN_COLOR,
      openCount: 1,
    });
  });
});

describe('selectTasksOfSong', () => {
  it('keeps the tasks pointing at that composition', () => {
    const tasks = [
      task({ id: 'a', songId: 'song-1' }),
      task({ id: 'b', songId: 'song-2' }),
      task({ id: 'c' }),
    ];
    expect(selectTasksOfSong(tasks, 'song-1').map((entry) => entry.id)).toEqual(['a']);
    expect(selectTasksOfSong(tasks, 'song-3')).toEqual([]);
  });
});

describe('findSongTitle', () => {
  const songs = [{ id: 'song-1', title: 'Runaway Sun' }];

  it('answers the title a task points at, and null when it points nowhere', () => {
    expect(findSongTitle(songs, 'song-1')).toBe('Runaway Sun');
    expect(findSongTitle(songs, null)).toBeNull();
    expect(findSongTitle(songs, 'song-9')).toBeNull();
  });
});

describe('selectFormAfterDeletion', () => {
  it('clears the form only when the deleted task is the one it holds', () => {
    expect(selectFormAfterDeletion('task-1', 'task-1')).toBe('clear-form');
    expect(selectFormAfterDeletion('task-1', 'task-2')).toBe('keep-form');
    expect(selectFormAfterDeletion(null, 'task-1')).toBe('keep-form');
  });
});

describe('the due date the form reads and writes', () => {
  it('shows a stored timestamp as a date, and writes a date back at midday UTC', () => {
    expect(toDateInputValue('2026-05-01T12:00:00.000Z')).toBe('2026-05-01');
    expect(toDateInputValue(null)).toBe('');
    expect(toIsoDueDate('2026-05-01')).toBe('2026-05-01T12:00:00.000Z');
    expect(toIsoDueDate('')).toBeNull();
  });
});

describe('formValuesFromTask', () => {
  it('opens a task in the form it is edited through', () => {
    expect(
      formValuesFromTask(
        task({ status: 'doing', assigneeId: 'member-1', dueDate: '2026-05-01T12:00:00.000Z' }),
      ),
    ).toEqual({
      title: 'Buy strings',
      notes: '',
      status: 'doing',
      assigneeId: 'member-1',
      songId: null,
      dueDate: '2026-05-01',
    });
  });
});

describe('payloadFromFormValues', () => {
  it('trims the title and refuses a form that carries none', () => {
    expect(payloadFromFormValues({ ...BLANK_TASK_FORM, title: '  Buy strings ' })).toMatchObject({
      title: 'Buy strings',
      dueDate: null,
    });
    expect(payloadFromFormValues(BLANK_TASK_FORM)).toBeNull();
    expect(payloadFromFormValues({ ...BLANK_TASK_FORM, title: '   ' })).toBeNull();
  });
});
