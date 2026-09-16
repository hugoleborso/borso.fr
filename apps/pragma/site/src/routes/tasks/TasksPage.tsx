/** @Feature tasks */

import { nextStatusAfterToggle } from '@domain/task-status.core';
import { selectCompositions } from '@domain/song-origin.core';
import type { JSX } from 'react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { PageHeader } from '../../components/molecules/PageHeader';
import { MemberTaskColumn } from '../../components/organisms/MemberTaskColumn';
import { TaskForm, type TaskFormValues } from '../../components/organisms/TaskForm';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { ApiError } from '../../lib/api.client';
import { formatDueDate, isDueDatePast } from '../../lib/formatters.utils';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import {
  useCreateTask,
  useDeleteTask,
  useTasksList,
  useUpdateTask,
} from '../../lib/queries/tasks.queries';
import {
  BLANK_TASK_FORM,
  findSongTitle,
  formValuesFromTask,
  groupTasksByMember,
  type MemberShape,
  payloadFromFormValues,
  selectFormAfterDeletion,
  type TaskFormShape,
  type TaskShape,
} from './tasks-page.core';

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint route-list-page
export function TasksPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const tasksQuery = useTasksList();
  const membersQuery = useMembersList();
  const songsQuery = useSongsList();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [editedTaskId, setEditedTaskId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<TaskFormShape>(BLANK_TASK_FORM);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);

  const tasks = useMemo<readonly TaskShape[]>(
    () => tasksQuery.data?.tasks ?? NO_ROWS,
    [tasksQuery.data],
  );
  const members = useMemo<readonly MemberShape[]>(
    () => membersQuery.data?.members ?? NO_ROWS,
    [membersQuery.data],
  );
  const compositions = useMemo(
    () => selectCompositions(songsQuery.data?.songs ?? NO_ROWS),
    [songsQuery.data],
  );
  const groups = useMemo(
    () => groupTasksByMember(tasks, members, t('tasks.unassigned')),
    [tasks, members, t],
  );

  const closeForm = (): void => {
    setEditedTaskId(null);
    setFormValues(BLANK_TASK_FORM);
  };

  const openTask = (task: TaskShape): void => {
    setEditedTaskId(task.id);
    setFormValues(formValuesFromTask(task));
  };

  const saveTask = async (values: TaskFormValues): Promise<void> => {
    const taskWrite = payloadFromFormValues(values);
    if (taskWrite === null) return;
    if (editedTaskId === null) {
      await createTask.mutateAsync(taskWrite);
    } else {
      await updateTask.mutateAsync({ id: editedTaskId, ...taskWrite });
    }
    closeForm();
  };

  const applyDeletionEffect = {
    'keep-form': (): void => undefined,
    'clear-form': closeForm,
  } as const;

  const confirmDeletion = (taskId: string): void => {
    deleteTask.mutate({ id: taskId });
    applyDeletionEffect[selectFormAfterDeletion(editedTaskId, taskId)]();
    setPendingDeletionId(null);
  };

  const lastError: unknown =
    tasksQuery.error ?? createTask.error ?? updateTask.error ?? deleteTask.error ?? null;
  const errorMessage =
    lastError instanceof ApiError ? lastError.message : lastError === null ? null : 'unknown-error';

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader title={t('tasks.title')} subtitle={t('tasks.subtitle')} />
      {errorMessage === null ? null : (
        <p className="text-danger text-sm mb-3" role="alert">
          {errorMessage}
        </p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
          {tasksQuery.isLoading ? (
            <p className="text-ink-400 italic text-sm m-0">{t('common.loading')}</p>
          ) : null}
          {groups.map((group) => (
            <MemberTaskColumn
              key={group.memberId ?? 'unassigned'}
              group={group}
              dueLabelOf={(task) => formatDueDate(task.dueDate, i18n.language)}
              isOverdue={(task) => isDueDatePast(task.dueDate, nowEpochMs)}
              songTitleOf={(task) => findSongTitle(compositions, task.songId)}
              onToggleDone={(task) =>
                updateTask.mutate({ id: task.id, status: nextStatusAfterToggle(task.status) })
              }
              onOpen={openTask}
              onDelete={(task) => setPendingDeletionId(task.id)}
            />
          ))}
        </div>

        <TaskForm
          key={editedTaskId ?? 'new'}
          values={formValues}
          isEditing={editedTaskId !== null}
          members={members}
          compositions={compositions}
          onSubmit={saveTask}
          onCancel={closeForm}
        />
      </div>
      {pendingDeletionId === null ? null : (
        <ConfirmDialog
          question={t('tasks.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onConfirm={() => confirmDeletion(pendingDeletionId)}
          onCancel={() => setPendingDeletionId(null)}
        />
      )}
    </section>
  );
}
