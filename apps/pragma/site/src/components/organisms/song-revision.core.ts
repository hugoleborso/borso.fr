/** @Feature tasks */

import type { TaskStatus } from '@domain/task-status.core';

export interface RevisionSession {
  readonly id: string;
  readonly date: string;
}

export interface RevisionTask {
  readonly id: string;
  readonly status: TaskStatus;
  readonly assigneeId: string | null;
  readonly songId: string | null;
  readonly sessionId: string | null;
}

export interface RevisionTaskWrite {
  readonly title: string;
  readonly assigneeId: string;
  readonly songId: string;
  readonly sessionId: string;
  readonly dueDate: string;
}

// @FollowsBlueprint core-view-projection
export function indexRevisionTasksBySong<TTask extends RevisionTask>(
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

export function selectSessionToRevise<TSession extends RevisionSession>(
  songTasks: readonly RevisionTask[],
  memberId: string | null,
  nextSession: TSession | null,
): TSession | null {
  if (memberId === null || nextSession === null) return null;
  const hasOwnRevision = songTasks.some((task) => task.assigneeId === memberId);
  return hasOwnRevision ? null : nextSession;
}

export function buildRevisionTask(input: {
  readonly title: string;
  readonly memberId: string;
  readonly songId: string;
  readonly session: RevisionSession;
}): RevisionTaskWrite {
  return {
    title: input.title,
    assigneeId: input.memberId,
    songId: input.songId,
    sessionId: input.session.id,
    dueDate: new Date(input.session.date).toISOString(),
  };
}
