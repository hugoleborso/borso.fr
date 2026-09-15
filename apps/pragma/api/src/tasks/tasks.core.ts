import type { TaskStatus } from '@domain/task-status.core';

export interface TaskOrderingShape {
  readonly title: string;
  readonly status: TaskStatus;
  readonly dueDate: Date | null;
}

const STATUS_RANK: Readonly<Record<TaskStatus, number>> = {
  doing: 0,
  todo: 1,
  done: 2,
};

const DATED_BEFORE_UNDATED = -1;
const UNDATED_AFTER_DATED = 1;

function compareDueDates(left: Date | null, right: Date | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return UNDATED_AFTER_DATED;
  if (right === null) return DATED_BEFORE_UNDATED;
  return left.getTime() - right.getTime();
}

// @FollowsBlueprint core-decision
export function compareTasksByUrgency(left: TaskOrderingShape, right: TaskOrderingShape): number {
  const byStatus = STATUS_RANK[left.status] - STATUS_RANK[right.status];
  if (byStatus !== 0) return byStatus;
  const byDueDate = compareDueDates(left.dueDate, right.dueDate);
  if (byDueDate !== 0) return byDueDate;
  return left.title.localeCompare(right.title);
}

export function sortTasksByUrgency<Task extends TaskOrderingShape>(
  tasks: readonly Task[],
): readonly Task[] {
  return tasks.toSorted(compareTasksByUrgency);
}
