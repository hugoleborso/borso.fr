export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const DEFAULT_TASK_STATUS: TaskStatus = 'todo';

export function isTaskOpen(task: { readonly status: TaskStatus }): boolean {
  return task.status !== 'done';
}

// @FollowsBlueprint core-decision
export function nextStatusAfterToggle(status: TaskStatus): TaskStatus {
  return status === 'done' ? DEFAULT_TASK_STATUS : 'done';
}

export function countOpenTasks(tasks: readonly { readonly status: TaskStatus }[]): number {
  return tasks.filter(isTaskOpen).length;
}
