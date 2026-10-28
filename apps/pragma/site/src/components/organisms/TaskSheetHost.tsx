/** @Feature tasks */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import { TaskForm, type TaskFormProps } from './TaskForm';
import type { TaskSheetController } from './task-sheet.hook';

export interface TaskSheetHostProps {
  readonly controller: TaskSheetController;
  readonly members: TaskFormProps['members'];
  readonly compositions: TaskFormProps['compositions'];
}

// @FollowsBlueprint organism-presentational
export function TaskSheetHost({
  controller,
  members,
  compositions,
}: TaskSheetHostProps): JSX.Element {
  const { t } = useTranslation();
  const { openSheet, pendingDeletionId } = controller;
  return (
    <>
      {openSheet === null ? null : (
        <TaskForm
          key={openSheet.draftKey}
          draftKey={openSheet.draftKey}
          values={openSheet.values}
          isEditing={openSheet.isEditing}
          members={members}
          compositions={compositions}
          onSubmit={controller.save}
          onClose={controller.close}
        />
      )}
      {pendingDeletionId === null ? null : (
        <ConfirmDialog
          question={t('tasks.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onConfirm={controller.confirmDeletion}
          onCancel={controller.cancelDeletion}
        />
      )}
    </>
  );
}
