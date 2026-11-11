export interface ScheduledTask {
  readonly isDue: boolean;
  readonly nextRunOn: string;
}

// @FollowsBlueprint core-view-projection
export function orderRecurringTasks<Task extends ScheduledTask>(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(
    (left, right) =>
      Number(right.isDue) - Number(left.isDue) || left.nextRunOn.localeCompare(right.nextRunOn),
  );
}

export function countDueTasks(tasks: readonly ScheduledTask[]): number {
  return tasks.filter((task) => task.isDue).length;
}
