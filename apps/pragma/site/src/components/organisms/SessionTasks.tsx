/** @Feature tasks */

import { type JSX, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { useTasksList } from '../../lib/queries/tasks.queries';
import { findAssignee, selectTasksOfSession } from '../../routes/band/band-tasks.core';
import { Button } from '../atoms/Button';
import { TaskList } from './TaskList';
import { TaskSheetHost } from './TaskSheetHost';
import { useTaskRowLabels, useTaskSheet } from './task-sheet.hook';

export interface SessionTasksProps {
  readonly sessionId: string;
}

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint organism-query-owning
export function SessionTasks({ sessionId }: SessionTasksProps): JSX.Element {
  const { t } = useTranslation();
  const tasksQuery = useTasksList();
  const membersQuery = useMembersList();
  const songsQuery = useSongsList();
  const taskSheet = useTaskSheet();

  const songs = useMemo(() => songsQuery.data?.songs ?? NO_ROWS, [songsQuery.data]);
  const members = useMemo(() => membersQuery.data?.members ?? NO_ROWS, [membersQuery.data]);
  const sessionTasks = useMemo(
    () => selectTasksOfSession(tasksQuery.data?.tasks ?? NO_ROWS, sessionId),
    [tasksQuery.data, sessionId],
  );
  const rowLabels = useTaskRowLabels(songs);

  return (
    <section className="flex flex-col gap-2" aria-labelledby="session-tasks-title">
      <h2 id="session-tasks-title" className="m-0 font-display text-title text-ink">
        {t('sessions.whoDoesWhat')}
      </h2>
      {taskSheet.errorMessage === null ? null : (
        <p className="m-0 text-meta text-danger" role="alert">
          {taskSheet.errorMessage}
        </p>
      )}
      {sessionTasks.length === 0 ? (
        <p className="m-0 text-meta text-ink-soft">{t('sessions.noTaskYet')}</p>
      ) : (
        <TaskList
          label={t('sessions.whoDoesWhat')}
          tasks={sessionTasks}
          {...rowLabels}
          assigneeOf={(task) => findAssignee(members, task.assigneeId)}
          onToggleDone={taskSheet.toggleDone}
          onOpen={taskSheet.openTask}
          onDelete={taskSheet.requestDeletion}
        />
      )}
      <div>
        <Button icon="plus" variant="secondary" onClick={() => taskSheet.openNewTask(sessionId)}>
          {t('sessions.addTask')}
        </Button>
      </div>
      <TaskSheetHost controller={taskSheet} members={members} songs={songs} />
    </section>
  );
}
