import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { buildTodoEdit } from './todo-form.core';

export interface TodoEditFormProps {
  readonly text: string;
  readonly dueDate?: string;
  readonly onSave: (patch: { text?: string; dueDate?: string | null }) => void;
  readonly onCancel: () => void;
}

// @FollowsBlueprint organism-form
export function TodoEditForm({ text, dueDate, onSave, onCancel }: TodoEditFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { text, dueDate: dueDate ?? '' },
    onSubmit: ({ value }) => {
      onSave(buildTodoEdit({ text, dueDate }, value));
    },
  });
  return (
    <li className="py-3 border-b border-line last:border-b-0">
      <form
        className="flex flex-col gap-2 px-2"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="text">
          {(field) => (
            <Input
              aria-label={t('todo.row.text-label')}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </form.Field>
        <div className="flex items-center gap-2">
          <form.Field name="dueDate">
            {(field) => (
              <Input
                type="date"
                aria-label={t('todo.add.due-label')}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                className="flex-1"
              />
            )}
          </form.Field>
          <Button variant="quiet" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {t('common.save')}
          </Button>
        </div>
      </form>
    </li>
  );
}
