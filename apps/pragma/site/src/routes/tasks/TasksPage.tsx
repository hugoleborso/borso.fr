/** @Feature tasks */

import { nextStatusAfterToggle } from '@domain/task-status.core';
import { selectCompositions } from '@domain/song-origin.core';
import type { JSX } from 'react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { PageHeader } from '../../components/molecules/PageHeader';
import { QuickAddForm } from '../../components/organisms/QuickAddForm';
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
const NEW_TASK_DRAFT_KEY = 'new';

// @FollowsBlueprint route-list-page
export function TasksPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const tasksQuery = useTasksList();
  const membersQuery = useMembersList();
  const songsQuery = useSongsList();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
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
    setIsSheetOpen(false);
    setEditedTaskId(null);
    setFormValues(BLANK_TASK_FORM);
  };

  const openNewTask = (): void => {
    setEditedTaskId(null);
    setFormValues(BLANK_TASK_FORM);
    setIsSheetOpen(true);
  };

  const openTask = (task: TaskShape): void => {
    setEditedTaskId(task.id);
    setFormValues(formValuesFromTask(task));
    setIsSheetOpen(true);
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

  const addTaskByTitle = async (title: string): Promise<void> => {
    const taskWrite = payloadFromFormValues({ ...BLANK_TASK_FORM, title });
    if (taskWrite === null) return;
    await createTask.mutateAsync(taskWrite);
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
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px]">
      <PageHeader
        title={t('tasks.title')}
        actions={
          <Button icon="plus" variant="primary" onClick={openNewTask}>
            {t('tasks.newTitle')}
          </Button>
        }
      />
      <QuickAddForm
        inputId="task-quick-add"
        label={t('tasks.quickAddLabel')}
        submitLabel={t('tasks.quickAddSubmit')}
        onAdd={addTaskByTitle}
      />
      {errorMessage === null ? null : (
        <p className="text-danger text-meta mb-3" role="alert">
          {errorMessage}
        </p>
      )}
      <div className="@container min-w-0">
        <div className="grid grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3 gap-3">
          {tasksQuery.isLoading ? (
            <p className="text-ink-soft italic text-meta m-0">{t('common.loading')}</p>
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
      </div>
      {isSheetOpen ? (
        <TaskForm
          key={editedTaskId ?? NEW_TASK_DRAFT_KEY}
          draftKey={editedTaskId ?? NEW_TASK_DRAFT_KEY}
          values={formValues}
          isEditing={editedTaskId !== null}
          members={members}
          compositions={compositions}
          onSubmit={saveTask}
          onClose={closeForm}
        />
      ) : null}
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
