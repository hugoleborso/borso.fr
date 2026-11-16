/** @Feature tasks */

import { selectNextSession } from '@domain/session-schedule.core';
import { useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useCreateTask, useTasksList } from '../../lib/queries/tasks.queries';
import {
  buildBrushUpTask,
  indexBrushUpTasksBySong,
  selectSessionToBrushUp,
  type BrushUpTask,
} from './brush-up.core';

export interface SongBrushUps {
  readonly askActionOf: (songId: string, songTitle: string) => (() => void) | undefined;
}

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint hook-stateful-helper
export function useSongBrushUps(): SongBrushUps {
  const { t } = useTranslation();
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const sessionsQuery = useSessionsList();
  const tasksQuery = useTasksList();
  const signedInMember = useSignedInMember();
  const createTask = useCreateTask();

  const nextSession = useMemo(
    () => selectNextSession(sessionsQuery.data?.sessions ?? NO_ROWS, new Date(nowEpochMs)),
    [sessionsQuery.data, nowEpochMs],
  );
  const tasks = tasksQuery.data?.tasks;
  const tasksBySong = useMemo(
    () => (tasks === undefined ? null : indexBrushUpTasksBySong(tasks, nextSession?.id ?? null)),
    [tasks, nextSession],
  );
  const memberId = signedInMember.data?.memberId ?? null;
  const songTasksOf = (songId: string): readonly BrushUpTask[] | null =>
    tasksBySong === null ? null : (tasksBySong.get(songId) ?? NO_ROWS);

  return {
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
  };
}
