/** @Feature tasks */

import { nextStatusAfterToggle } from '@domain/task-status.core';
import { useSyncExternalStore, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { ApiError } from '../../lib/api.client';
import { formatDueDate, isDueDatePast } from '../../lib/formatters.utils';
import { useCreateTask, useDeleteTask, useUpdateTask } from '../../lib/queries/tasks.queries';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useSessionLabel } from '../../lib/session-label.hook';
import {
  blankTaskFormFor,
  newTaskDraftKey,
  findSongTitle,
  formValuesFromTask,
  payloadFromFormValues,
  selectFormAfterDeletion,
  type TaskFormShape,
  type TaskShape,
} from '../../routes/band/band-tasks.core';

export interface OpenTaskSheet {
  readonly draftKey: string;
  readonly values: TaskFormShape;
  readonly isEditing: boolean;
}

export interface TaskSheetController {
  readonly openSheet: OpenTaskSheet | null;
  readonly pendingDeletionId: string | null;
  readonly errorMessage: string | null;
  readonly openNewTask: (sessionId?: string | null) => void;
  readonly openTask: (task: TaskShape) => void;
  readonly toggleDone: (task: TaskShape) => void;
  readonly requestDeletion: (task: TaskShape) => void;
  readonly save: (values: TaskFormShape) => Promise<void>;
  readonly close: () => void;
  readonly confirmDeletion: () => void;
  readonly cancelDeletion: () => void;
}

// @FollowsBlueprint hook-stateful-helper
export function useTaskSheet(): TaskSheetController {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [openSheet, setOpenSheet] = useState<OpenTaskSheet | null>(null);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);
  const editedTaskId = openSheet?.isEditing === true ? openSheet.draftKey : null;

  const close = (): void => {
    setOpenSheet(null);
  };

  const save = async (values: TaskFormShape): Promise<void> => {
    const taskWrite = payloadFromFormValues(values);
    if (taskWrite === null) return;
    if (editedTaskId === null) await createTask.mutateAsync(taskWrite);
    else await updateTask.mutateAsync({ id: editedTaskId, ...taskWrite });
    close();
  };

  const applyDeletionEffect = {
    'keep-form': (): void => undefined,
    'clear-form': close,
  } as const;

  const confirmDeletion = (): void => {
    if (pendingDeletionId === null) return;
    deleteTask.mutate({ id: pendingDeletionId });
    applyDeletionEffect[selectFormAfterDeletion(editedTaskId, pendingDeletionId)]();
    setPendingDeletionId(null);
  };

  const lastError: unknown = createTask.error ?? updateTask.error ?? deleteTask.error ?? null;

  return {
    openSheet,
    pendingDeletionId,
    errorMessage:
      lastError instanceof ApiError
        ? lastError.message
        : lastError === null
          ? null
          : 'unknown-error',
    openNewTask: (sessionId = null) => {
      setOpenSheet({
        draftKey: newTaskDraftKey(sessionId),
        values: blankTaskFormFor(sessionId),
        isEditing: false,
      });
    },
    openTask: (task) => {
      setOpenSheet({ draftKey: task.id, values: formValuesFromTask(task), isEditing: true });
    },
    toggleDone: (task) => {
      updateTask.mutate({ id: task.id, status: nextStatusAfterToggle(task.status) });
    },
    requestDeletion: (task) => {
      setPendingDeletionId(task.id);
    },
    save,
    close,
    confirmDeletion,
    cancelDeletion: () => {
      setPendingDeletionId(null);
    },
  };
}

export interface TaskRowLabels {
  readonly dueLabelOf: (task: TaskShape) => string | null;
  readonly isOverdue: (task: TaskShape) => boolean;
  readonly songTitleOf: (task: TaskShape) => string | null;
}

export function useTaskRowLabels(
  songs: readonly { readonly id: string; readonly title: string }[],
): TaskRowLabels {
  const { i18n } = useTranslation();
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  return {
    dueLabelOf: (task) => formatDueDate(task.dueDate, i18n.language),
    isOverdue: (task) => isDueDatePast(task.dueDate, nowEpochMs),
    songTitleOf: (task) => findSongTitle(songs, task.songId),
  };
}

export interface TaskSessionOption {
  readonly id: string;
  readonly label: string;
}

const NO_SESSIONS: readonly never[] = [];

export function useTaskSessionOptions(): readonly TaskSessionOption[] {
  const sessionsQuery = useSessionsList();
  const labelOf = useSessionLabel();
  return (sessionsQuery.data?.sessions ?? NO_SESSIONS).map((session) => ({
    id: session.id,
    label: labelOf(session),
  }));
}
