/** @Feature tasks */

import type { TaskStatus } from '@domain/task-status.core';

export interface BrushUpSession {
  readonly id: string;
  readonly date: string;
}

export interface BrushUpTask {
  readonly id: string;
  readonly status: TaskStatus;
  readonly assigneeId: string | null;
  readonly songId: string | null;
  readonly sessionId: string | null;
}

export interface BrushUpTaskWrite {
  readonly title: string;
  readonly assigneeId: string;
  readonly songId: string;
  readonly sessionId: string;
  readonly dueDate: string;
}

// @FollowsBlueprint core-view-projection
export function indexBrushUpTasksBySong<TTask extends BrushUpTask>(
  tasks: readonly TTask[],
  sessionId: string | null,
): ReadonlyMap<string, readonly TTask[]> {
  const bySong = new Map<string, TTask[]>();
  for (const task of tasks) {
    if (sessionId === null || task.sessionId !== sessionId || task.songId === null) continue;
    bySong.set(task.songId, [...(bySong.get(task.songId) ?? []), task]);
  }
  return bySong;
}

export function selectSessionToBrushUp<TSession extends BrushUpSession>(
  songTasks: readonly BrushUpTask[] | null,
  memberId: string | null,
  nextSession: TSession | null,
): TSession | null {
  if (songTasks === null || memberId === null) return null;
  const hasOwnBrushUp = songTasks.some((task) => task.assigneeId === memberId);
  return hasOwnBrushUp ? null : nextSession;
}

export function buildBrushUpTask(input: {
  readonly title: string;
  readonly memberId: string;
  readonly songId: string;
  readonly session: BrushUpSession;
}): BrushUpTaskWrite {
  return {
    title: input.title,
    assigneeId: input.memberId,
    songId: input.songId,
    sessionId: input.session.id,
    dueDate: new Date(input.session.date).toISOString(),
  };
}
