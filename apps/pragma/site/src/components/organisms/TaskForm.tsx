/** @Feature tasks */

import { TASK_NOTES_MAX_LENGTH, TASK_TITLE_MAX_LENGTH } from '@domain/input-limits.core';
import { TASK_STATUSES, type TaskStatus } from '@domain/task-status.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Icon, type IconName } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { MemberChip } from '../molecules/MemberChip';
import { Sheet } from '../molecules/Sheet';
import { inputVariants } from '../atoms/input.variants';
import { TASK_STATUS_LABEL_KEY } from '../../routes/tasks/tasks-page.core';
import { createSheetDraftStore } from '../../lib/sheet-draft.store';

export interface TaskFormValues {
  readonly title: string;
  readonly notes: string;
  readonly status: TaskStatus;
  readonly assigneeId: string | null;
  readonly songId: string | null;
  readonly dueDate: string;
}

export interface TaskFormProps {
  readonly draftKey: string;
  readonly values: TaskFormValues;
  readonly isEditing: boolean;
  readonly members: readonly {
    readonly id: string;
    readonly firstName: string;
    readonly color: string;
  }[];
  readonly compositions: readonly { readonly id: string; readonly title: string }[];
  readonly onSubmit: (values: TaskFormValues) => Promise<void>;
  readonly onClose: () => void;
}

const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';
const SELECT_CLASS = inputVariants({ size: 'md' });
const NO_COMPOSITION_VALUE = '';
const TASK_STATUS_ICON = {
  todo: 'tasks',
  doing: 'play',
  done: 'check',
} as const satisfies Readonly<Record<TaskStatus, IconName>>;
const NOTES_ROWS = 3;

const useTaskDraft = createSheetDraftStore<TaskFormValues>();

function compositionIdFromValue(value: string): string | null {
  return value === NO_COMPOSITION_VALUE ? null : value;
}

// @FollowsBlueprint organism-form
export function TaskForm(props: TaskFormProps): JSX.Element {
  const { t } = useTranslation();
  const kept = useTaskDraft(props.draftKey);
  const form = useForm({
    defaultValues: kept.draft ?? props.values,
    onSubmit: async ({ value }) => {
      await props.onSubmit(value);
      kept.discard();
    },
  });

  const closeKeepingDraft = (): void => {
    if (form.state.isDirty && !form.state.isSubmitSuccessful) kept.keep(form.state.values);
    props.onClose();
  };

  const sheetTitle = t(props.isEditing ? 'tasks.editTitle' : 'tasks.newTitle');

  return (
    <Sheet
      title={sheetTitle}
      label={sheetTitle}
      onClose={closeKeepingDraft}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button
              icon="check"
              type="submit"
              variant="primary"
              disabled={!canSubmit || isSubmitting}
            >
              {t('common.save')}
            </Button>
          )}
        </form.Subscribe>
      }
    >
      <div className="flex flex-col gap-2.5">
        <label className={LABEL_CLASS} htmlFor="task-title">
          {t('tasks.titleField')}
        </label>
        <form.Field name="title">
          {(field) => (
            <Input
              id="task-title"
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
              maxLength={TASK_TITLE_MAX_LENGTH}
            />
          )}
        </form.Field>

        <span className={LABEL_CLASS}>{t('tasks.assignee')}</span>
        <form.Field name="assigneeId">
          {(field) => (
            <div className="flex flex-wrap gap-1.5" role="group">
              <Chip pressed={field.state.value === null} onPress={() => field.handleChange(null)}>
                <Icon name="members" />
                {t('tasks.unassigned')}
              </Chip>
              {props.members.map((member) => (
                <Chip
                  key={member.id}
                  pressed={field.state.value === member.id}
                  onPress={() => field.handleChange(member.id)}
                >
                  <MemberChip memberName={member.firstName} memberColor={member.color} />
                  {member.firstName}
                </Chip>
              ))}
            </div>
          )}
        </form.Field>

        <span className={LABEL_CLASS}>{t('tasks.status')}</span>
        <form.Field name="status">
          {(field) => (
            <div className="flex flex-wrap gap-1.5" role="group">
              {TASK_STATUSES.map((status) => (
                <Chip
                  key={status}
                  pressed={field.state.value === status}
                  onPress={() => field.handleChange(status)}
                >
                  <Icon name={TASK_STATUS_ICON[status]} />
                  {t(TASK_STATUS_LABEL_KEY[status])}
                </Chip>
              ))}
            </div>
          )}
        </form.Field>

        <label className={LABEL_CLASS} htmlFor="task-song">
          {t('tasks.linkedComposition')}
        </label>
        <form.Field name="songId">
          {(field) => (
            <select
              id="task-song"
              value={field.state.value ?? NO_COMPOSITION_VALUE}
              onChange={(event) => field.handleChange(compositionIdFromValue(event.target.value))}
              className={SELECT_CLASS}
            >
              <option value={NO_COMPOSITION_VALUE}>{t('tasks.noComposition')}</option>
              {props.compositions.map((composition) => (
                <option key={composition.id} value={composition.id}>
                  {composition.title}
                </option>
              ))}
            </select>
          )}
        </form.Field>

        <label className={LABEL_CLASS} htmlFor="task-due">
          {t('tasks.dueDate')}
        </label>
        <form.Field name="dueDate">
          {(field) => (
            <Input
              id="task-due"
              type="date"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </form.Field>

        <label className={LABEL_CLASS} htmlFor="task-notes">
          {t('tasks.notes')}
        </label>
        <form.Field name="notes">
          {(field) => (
            <AutoGrowTextarea
              id="task-notes"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              maxLength={TASK_NOTES_MAX_LENGTH}
              rows={NOTES_ROWS}
              className="font-display italic"
            />
          )}
        </form.Field>
      </div>
    </Sheet>
  );
}
