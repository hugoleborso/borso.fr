import type { TaskStatus } from '@domain/task-status.core';
import type { NamedEntity } from '../instruments/lineup-names.core';

export interface ToolTask {
  readonly id: string;
  readonly title: string;
  readonly notes: string;
  readonly status: TaskStatus;
  readonly assigneeId: string | null;
  readonly songId: string | null;
  readonly dueDate: Date | null;
}

export interface TaskFilter {
  readonly assigneeId?: string | undefined;
  readonly songId?: string | undefined;
  readonly status?: TaskStatus | undefined;
}

export interface TaskToolView {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly due: string | null;
  readonly assignee: string | null;
  readonly song: string | null;
  readonly notes: string;
}

function nameOptional(entities: readonly NamedEntity[], id: string | null): string | null {
  return entities.find((entity) => entity.id === id)?.name ?? id;
}

function isTaskKept(task: ToolTask, filter: TaskFilter): boolean {
  const isAssigneeKept = filter.assigneeId === undefined || task.assigneeId === filter.assigneeId;
  const isSongKept = filter.songId === undefined || task.songId === filter.songId;
  const isStatusKept = filter.status === undefined || task.status === filter.status;
  return isAssigneeKept && isSongKept && isStatusKept;
}

// @FollowsBlueprint core-projection
export function projectTasksForTool(
  tasks: readonly ToolTask[],
  members: readonly NamedEntity[],
  songs: readonly NamedEntity[],
  filter: TaskFilter,
): TaskToolView[] {
  return tasks
    .filter((task) => isTaskKept(task, filter))
    .map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      due: task.dueDate?.toISOString() ?? null,
      assignee: nameOptional(members, task.assigneeId),
      song: nameOptional(songs, task.songId),
      notes: task.notes,
    }));
}

const SELF_REFERENCE = 'me';

export function isSelfReference(reference: string): boolean {
  return reference.trim().toLowerCase() === SELF_REFERENCE;
}

export interface TaskLinks {
  readonly assigneeId?: string | null;
  readonly songId?: string | null;
}

export function keepGivenLinks(
  assigneeId: string | null | undefined,
  songId: string | null | undefined,
): TaskLinks {
  return {
    ...(assigneeId === undefined ? {} : { assigneeId }),
    ...(songId === undefined ? {} : { songId }),
  };
}
