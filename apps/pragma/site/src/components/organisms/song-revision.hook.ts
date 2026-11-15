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
  buildRevisionTask,
  indexRevisionTasksBySong,
  selectSessionToRevise,
  type RevisionTask,
} from './song-revision.core';

export interface RevisionLine {
  readonly taskId: string;
  readonly isDone: boolean;
  readonly assignee: { readonly name: string; readonly color: string } | null;
}

export interface SongRevisions {
  readonly sessionLabel: string | null;
  readonly linesOf: (songId: string) => readonly RevisionLine[];
  readonly askActionOf: (songId: string, songTitle: string) => (() => void) | undefined;
  readonly toggle: (taskId: string) => void;
}

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint hook-stateful-helper
export function useSongRevisions(): SongRevisions {
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
  const tasks = tasksQuery.data?.tasks ?? NO_ROWS;
  const tasksBySong = useMemo(
    () => indexRevisionTasksBySong(tasks, nextSession?.id ?? null),
    [tasks, nextSession],
  );
  const members = membersQuery.data?.members ?? NO_ROWS;
  const memberId = signedInMember.data?.memberId ?? null;
  const songTasksOf = (songId: string): readonly RevisionTask[] =>
    tasksBySong.get(songId) ?? NO_ROWS;
  const statusOf = (taskId: string): TaskStatus | null =>
    tasks.find((task) => task.id === taskId)?.status ?? null;

  return {
    sessionLabel: nextSession === null ? null : labelOf(nextSession),
    linesOf: (songId) =>
      songTasksOf(songId).map((task) => ({
        taskId: task.id,
        isDone: task.status === 'done',
        assignee: findAssignee(members, task.assigneeId),
      })),
    askActionOf: (songId, songTitle) => {
      const session = selectSessionToRevise(songTasksOf(songId), memberId, nextSession);
      if (session === null || memberId === null) return undefined;
      return () =>
        createTask.mutate(
          buildRevisionTask({
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
