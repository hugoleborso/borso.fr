/** @Feature tasks */

import { countOpenTasks, DEFAULT_TASK_STATUS, type TaskStatus } from '@domain/task-status.core';

export interface TaskShape {
  readonly id: string;
  readonly title: string;
  readonly notes: string;
  readonly status: TaskStatus;
  readonly assigneeId: string | null;
  readonly songId: string | null;
  readonly dueDate: string | null;
}

export interface MemberShape {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface MemberTaskGroup {
  readonly memberId: string | null;
  readonly memberName: string;
  readonly memberColor: string;
  readonly tasks: readonly TaskShape[];
  readonly openCount: number;
}

export const TASK_STATUS_LABEL_KEY = {
  todo: 'tasks.statusTodo',
  doing: 'tasks.statusDoing',
  done: 'tasks.statusDone',
} as const satisfies Record<TaskStatus, string>;

export const UNASSIGNED_COLUMN_COLOR = '#8a8178';

function tasksOf(tasks: readonly TaskShape[], memberId: string | null): readonly TaskShape[] {
  return tasks.filter((task) => task.assigneeId === memberId);
}

// @FollowsBlueprint core-view-projection
export function groupTasksByMember(
  tasks: readonly TaskShape[],
  members: readonly MemberShape[],
  unassignedLabel: string,
): readonly MemberTaskGroup[] {
  const assignedGroups = members.map((member) => {
    const memberTasks = tasksOf(tasks, member.id);
    return {
      memberId: member.id,
      memberName: member.firstName,
      memberColor: member.color,
      tasks: memberTasks,
      openCount: countOpenTasks(memberTasks),
    };
  });
  const unassignedTasks = tasksOf(tasks, null);
  if (unassignedTasks.length === 0) return assignedGroups;
  return [
    ...assignedGroups,
    {
      memberId: null,
      memberName: unassignedLabel,
      memberColor: UNASSIGNED_COLUMN_COLOR,
      tasks: unassignedTasks,
      openCount: countOpenTasks(unassignedTasks),
    },
  ];
}

export function selectTasksOfSong(
  tasks: readonly TaskShape[],
  songId: string,
): readonly TaskShape[] {
  return tasks.filter((task) => task.songId === songId);
}

export function findSongTitle(
  songs: readonly { readonly id: string; readonly title: string }[],
  songId: string | null,
): string | null {
  return songs.find((song) => song.id === songId)?.title ?? null;
}

export type FormAfterDeletion = 'keep-form' | 'clear-form';

// @FollowsBlueprint core-view-intent
export function selectFormAfterDeletion(
  selectedTaskId: string | null,
  deletedTaskId: string,
): FormAfterDeletion {
  return selectedTaskId === deletedTaskId ? 'clear-form' : 'keep-form';
}

export interface TaskFormShape {
  readonly title: string;
  readonly notes: string;
  readonly status: TaskStatus;
  readonly assigneeId: string | null;
  readonly songId: string | null;
  readonly dueDate: string;
}

export const BLANK_TASK_FORM: TaskFormShape = {
  title: '',
  notes: '',
  status: DEFAULT_TASK_STATUS,
  assigneeId: null,
  songId: null,
  dueDate: '',
};

const NOON_UTC = 'T12:00:00.000Z';
const DATE_ONLY_LENGTH = 'YYYY-MM-DD'.length;

export function toDateInputValue(iso: string | null): string {
  return iso === null ? '' : iso.slice(0, DATE_ONLY_LENGTH);
}

export function toIsoDueDate(dateInputValue: string): string | null {
  return dateInputValue === '' ? null : new Date(`${dateInputValue}${NOON_UTC}`).toISOString();
}

export function formValuesFromTask(task: TaskShape): TaskFormShape {
  return {
    title: task.title,
    notes: task.notes,
    status: task.status,
    assigneeId: task.assigneeId,
    songId: task.songId,
    dueDate: toDateInputValue(task.dueDate),
  };
}

export interface TaskWritePayload {
  readonly title: string;
  readonly notes: string;
  readonly status: TaskStatus;
  readonly assigneeId: string | null;
  readonly songId: string | null;
  readonly dueDate: string | null;
}

// @FollowsBlueprint core-form-schema
export function payloadFromFormValues(values: TaskFormShape): TaskWritePayload | null {
  const title = values.title.trim();
  if (title.length === 0) return null;
  return {
    title,
    notes: values.notes,
    status: values.status,
    assigneeId: values.assigneeId,
    songId: values.songId,
    dueDate: toIsoDueDate(values.dueDate),
  };
}
