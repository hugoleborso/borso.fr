/** @Feature tasks */

import { selectNextSession } from '@domain/session-schedule.core';
import { nextStatusAfterToggle, type TaskStatus } from '@domain/task-status.core';
import { useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useCreateTask, useTasksList, useUpdateTask } from '../../lib/queries/tasks.queries';
import { useSessionLabel } from '../../lib/session-label.hook';
import { findAssignee } from '../../routes/band/band-tasks.core';
import {
  buildBrushUpTask,
  indexBrushUpTasksBySong,
  selectSessionToBrushUp,
  type BrushUpTask,
} from './brush-up.core';

export interface BrushUpLine {
  readonly taskId: string;
  readonly isDone: boolean;
  readonly assignee: ReturnType<typeof findAssignee>;
}

export interface SongBrushUps {
  readonly sessionLabel: string | null;
  readonly linesOf: (songId: string) => readonly BrushUpLine[];
  readonly askActionOf: (songId: string, songTitle: string) => (() => void) | undefined;
  readonly toggle: (taskId: string) => void;
}

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint hook-stateful-helper
export function useSongBrushUps(): SongBrushUps {
  const { t } = useTranslation();
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const sessionsQuery = useSessionsList();
  const tasksQuery = useTasksList();
  const membersQuery = useMembersList();
  const signedInMember = useSignedInMember();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const labelOf = useSessionLabel();

  const nextSession = useMemo(
    () => selectNextSession(sessionsQuery.data?.sessions ?? NO_ROWS, new Date(nowEpochMs)),
    [sessionsQuery.data, nowEpochMs],
  );
  const tasks = tasksQuery.data?.tasks;
  const tasksBySong = useMemo(
    () => (tasks === undefined ? null : indexBrushUpTasksBySong(tasks, nextSession?.id ?? null)),
    [tasks, nextSession],
  );
  const members = membersQuery.data?.members ?? NO_ROWS;
  const memberId = signedInMember.data?.memberId ?? null;
  const songTasksOf = (songId: string): readonly BrushUpTask[] | null =>
    tasksBySong === null ? null : (tasksBySong.get(songId) ?? NO_ROWS);
  const statusOf = (taskId: string): TaskStatus | null =>
    tasks?.find((task) => task.id === taskId)?.status ?? null;

  return {
    sessionLabel: nextSession === null ? null : labelOf(nextSession),
    linesOf: (songId) =>
      (songTasksOf(songId) ?? NO_ROWS).map((task) => ({
        taskId: task.id,
        isDone: task.status === 'done',
        assignee: findAssignee(members, task.assigneeId),
      })),
    askActionOf: (songId, songTitle) => {
      const session = selectSessionToBrushUp(songTasksOf(songId), memberId, nextSession);
      if (session === null || memberId === null) return undefined;
      return () =>
        createTask.mutate(
          buildBrushUpTask({
            title: t('setlist.revise.taskTitle', { title: songTitle }),
            memberId,
            songId,
            session,
          }),
        );
    },
    toggle: (taskId) => {
      const status = statusOf(taskId);
      if (status === null) return;
      updateTask.mutate({ id: taskId, status: nextStatusAfterToggle(status) });
    },
  };
}
