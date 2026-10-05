import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { useCreateTodo } from '../../lib/queries/todos.queries';
import { buildTodoCreation, canCreateTodo } from './todo-form.core';

// @FollowsBlueprint organism-form
export function TodoQuickAdd(): JSX.Element {
  const { t } = useTranslation();
  const createTodo = useCreateTodo();
  const form = useForm({
    defaultValues: { text: '', dueDate: '' },
    onSubmit: ({ value, formApi }) => {
      createTodo.mutate(buildTodoCreation(value));
      formApi.reset();
    },
  });
  return (
    <form
      className="flex flex-col gap-2 p-3 rounded-lg border border-line bg-surface"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="text">
        {(field) => (
          <Input
            aria-label={t('todo.add.placeholder')}
            placeholder={t('todo.add.placeholder')}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            enterKeyHint="done"
          />
        )}
      </form.Field>
      <div className="flex items-center gap-2">
        <form.Field name="dueDate">
          {(field) => (
            <label className="flex flex-1 items-center gap-2 text-sm text-ink-muted">
              <Icon name="calendar" size={18} />
              <span className="sr-only">{t('todo.add.due-label')}</span>
              <Input
                type="date"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </label>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.text}>
          {(text) => (
            <Button type="submit" variant="primary" disabled={!canCreateTodo(text)}>
              <Icon name="plus" size={18} />
              {t('todo.add.submit')}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
