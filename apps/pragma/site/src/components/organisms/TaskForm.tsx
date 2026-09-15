/** @Feature tasks */

import { TASK_STATUSES, type TaskStatus } from '@domain/task-status.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';
import { Input } from '../atoms/Input';
import { TASK_STATUS_LABEL_KEY } from '../../routes/tasks/tasks-page.core';

export interface TaskFormValues {
  readonly title: string;
  readonly notes: string;
  readonly status: TaskStatus;
  readonly assigneeId: string | null;
  readonly songId: string | null;
  readonly dueDate: string;
}

export interface TaskFormProps {
  readonly values: TaskFormValues;
  readonly isEditing: boolean;
  readonly members: readonly { readonly id: string; readonly firstName: string }[];
  readonly compositions: readonly { readonly id: string; readonly title: string }[];
  readonly onSubmit: (values: TaskFormValues) => Promise<void>;
  readonly onCancel: () => void;
}

const LABEL_CLASS = 'text-xs tracking-wider uppercase text-ink-400 font-medium';
const PILL_CLASS =
  'inline-flex items-center min-h-11 px-3 rounded-full border text-[12.5px] cursor-pointer transition-colors';
const PILL_CLASS_BY_STATE = {
  selected: 'bg-accent-soft border-accent text-accent font-medium',
  unselected: 'bg-bg border-line text-ink-500 hover:border-line-strong',
} as const;
const SELECT_CLASS =
  'min-h-11 px-2.5 rounded-md border border-line bg-bg text-[13.5px] text-ink-900';
const TITLE_MAX_LENGTH = 256;
const NOTES_MAX_LENGTH = 4_096;
const NO_COMPOSITION_VALUE = '';
const NOTES_ROWS = 3;

function pillClass(isSelected: boolean): string {
  return composeClassName(PILL_CLASS, PILL_CLASS_BY_STATE[isSelected ? 'selected' : 'unselected']);
}

function compositionIdFromValue(value: string): string | null {
  return value === NO_COMPOSITION_VALUE ? null : value;
}

// @FollowsBlueprint organism-form
export function TaskForm(props: TaskFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: props.values,
    onSubmit: async ({ value }) => {
      await props.onSubmit(value);
    },
  });

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="font-display italic text-2xl text-ink-900 m-0">
        {t(props.isEditing ? 'tasks.editTitle' : 'tasks.newTitle')}
      </h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-2.5"
      >
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
              maxLength={TITLE_MAX_LENGTH}
            />
          )}
        </form.Field>

        <span className={LABEL_CLASS}>{t('tasks.assignee')}</span>
        <form.Field name="assigneeId">
          {(field) => (
            <div className="flex flex-wrap gap-1.5" role="group">
              <button
                type="button"
                aria-pressed={field.state.value === null}
                onClick={() => field.handleChange(null)}
                className={pillClass(field.state.value === null)}
              >
                {t('tasks.unassigned')}
              </button>
              {props.members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  aria-pressed={field.state.value === member.id}
                  onClick={() => field.handleChange(member.id)}
                  className={pillClass(field.state.value === member.id)}
                >
                  {member.firstName}
                </button>
              ))}
            </div>
          )}
        </form.Field>

        <span className={LABEL_CLASS}>{t('tasks.status')}</span>
        <form.Field name="status">
          {(field) => (
            <div className="flex flex-wrap gap-1.5" role="group">
              {TASK_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={field.state.value === status}
                  onClick={() => field.handleChange(status)}
                  className={pillClass(field.state.value === status)}
                >
                  {t(TASK_STATUS_LABEL_KEY[status])}
                </button>
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
            <textarea
              id="task-notes"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              maxLength={NOTES_MAX_LENGTH}
              rows={NOTES_ROWS}
              className="px-2.5 py-2 rounded-md border border-line bg-bg text-[13.5px] text-ink-900 resize-y"
            />
          )}
        </form.Field>

        <div className="flex gap-2 mt-2">
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" variant="accent" disabled={!canSubmit || isSubmitting}>
                {t('common.save')}
              </Button>
            )}
          </form.Subscribe>
          {props.isEditing ? (
            <Button type="button" variant="ghost" onClick={props.onCancel}>
              {t('common.cancel')}
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
