import { useForm } from '@tanstack/react-form';
import type { TodoListName } from '@domain/todo-list.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { useCreateTodo } from '../../lib/queries/todos.queries';
import { buildTodoCreation, canCreateTodo } from './todo-form.core';

export interface TodoQuickAddProps {
  readonly list: TodoListName;
}

// @FollowsBlueprint organism-form
export function TodoQuickAdd({ list }: TodoQuickAddProps): JSX.Element {
  const { t } = useTranslation();
  const createTodo = useCreateTodo(list);
  const form = useForm({
    defaultValues: { text: '', dueDate: '' },
    onSubmit: ({ value, formApi }) => {
      createTodo.mutate(buildTodoCreation(value));
      formApi.reset();
    },
  });
  return (
    <div
      data-docked-composer
      className="fixed inset-x-0 z-30 bottom-[calc(4.5rem+max(8px,env(safe-area-inset-bottom)))] px-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <form
        className="max-w-[616px] mx-auto flex items-center gap-1.5 p-1.5 rounded-lg border border-line bg-surface-raised shadow-2"
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
              className="flex-1 min-w-0"
            />
          )}
        </form.Field>
        <form.Field name="dueDate">
          {(field) => (
            <label className="relative flex items-center justify-center shrink-0 min-w-11 h-11 px-1 rounded-md text-caption font-semibold text-bronze">
              {field.state.value === '' ? (
                <Icon name="calendar" size={20} className="text-ink-muted" />
              ) : (
                formatShortDay(field.state.value, DISPLAY_LOCALE)
              )}
              <span className="sr-only">{t('todo.add.due-label')}</span>
              <input
                type="date"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.text}>
          {(text) => (
            <Button
              type="submit"
              variant="primary"
              size="icon"
              aria-label={t('todo.add.submit')}
              disabled={!canCreateTodo(text)}
            >
              <Icon name="plus" size={20} />
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
