import type { TodoListName } from '@domain/todo-list.core';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Checkbox } from '../atoms/Checkbox';
import { Chip } from '../atoms/Chip';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { openActionSheet } from '../../lib/action-sheet.hook';
import {
  addDaysToIsoDay,
  DISPLAY_LOCALE,
  formatShortDay,
  toIsoDay,
} from '../../lib/calendar-day.utils';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';
import { useDeleteTodo, useTodos, useUpdateTodo } from '../../lib/queries/todos.queries';
import { buildTodoHref } from '../../lib/wikilinks.core';
import { CommitmentWithSources } from './CommitmentWithSources';
import { SourceView } from './SourceView';
import { TodoEditForm } from './TodoEditForm';
import { describeDue, selectDueIcon, selectDueStatus, selectDueTone } from './todo-list.core';

const SECTION_LABEL_CLASS_NAME = 'm-0 px-1 pb-1 text-label text-ink-muted';

export interface TodoDetailProps {
  readonly id: string;
  readonly list: TodoListName;
}

// @FollowsBlueprint organism-mutation-panel
export function TodoDetail({ id, list }: TodoDetailProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const todos = useTodos(list);
  const updateTodo = useUpdateTodo(list);
  const deleteTodo = useDeleteTodo(list);
  const [isEditing, setIsEditing] = useState(false);
  const todo = todos.data?.items.find((candidate) => candidate.id === id);
  const press = usePressGesture({
    onLongPress: () => {
      if (todo !== undefined)
        openActionSheet({ title: todo.text, subject: { kind: 'todo', list } });
    },
  });
  const today = toIsoDay(new Date());
  const status = selectDueStatus(
    { done: todo?.done ?? false, dueDate: todo?.dueDate },
    today,
    addDaysToIsoDay(today, 1),
  );
  const dueLabel = describeDue(
    todo?.dueDate,
    status,
    (key, date) => t(key, { date }),
    (isoDay) => formatShortDay(isoDay, DISPLAY_LOCALE),
  );

  return (
    <article className="pt-2 flex flex-col gap-4 pb-6">
      <div className="flex items-center -ml-3">
        <Button
          variant="quiet"
          size="icon"
          aria-label={t('brain.page.back')}
          onClick={() => void navigate(-1)}
        >
          <Icon name="back" size={22} />
        </Button>
      </div>
      {todos.data === undefined ? (
        <QueryState isPending={todos.isPending} onRetry={() => void todos.refetch()} />
      ) : null}
      {todos.data !== undefined && todo === undefined ? (
        <EmptyState icon="todo" label={t('todo.detail.not-found')} />
      ) : null}
      {todo === undefined ? null : (
        <>
          <Card padding="none" className="px-2">
            {isEditing ? (
              <ul className="m-0 p-0 list-none">
                <TodoEditForm
                  text={todo.text}
                  dueDate={todo.dueDate}
                  onCancel={() => setIsEditing(false)}
                  onSave={(patch) => {
                    setIsEditing(false);
                    updateTodo.mutate(
                      { id: todo.id, ...patch },
                      {
                        onSuccess: (savedTodo) => {
                          void navigate(buildTodoHref(savedTodo.id, list), { replace: true });
                        },
                      },
                    );
                  }}
                />
              </ul>
            ) : (
              <div
                {...press.handlers}
                className={composeClassName('flex items-start gap-1 py-1', PRESSABLE_CLASS_NAME)}
              >
                <Checkbox
                  isChecked={todo.done}
                  label={t('todo.row.toggle', { text: todo.text })}
                  onToggle={() => updateTodo.mutate({ id: todo.id, done: !todo.done })}
                />
                <div className="min-w-0 flex-1 py-2.5 pr-2">
                  <h1
                    className={composeClassName(
                      'm-0 text-heading break-words',
                      todo.done ? 'text-ink-muted line-through' : 'text-ink',
                    )}
                  >
                    {todo.text}
                  </h1>
                  {dueLabel === null ? null : (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Chip tone={todo.done ? 'neutral' : selectDueTone(status)}>
                        <Icon name={selectDueIcon(status)} size={13} />
                        {dueLabel}
                      </Chip>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2 px-2 pb-3 pt-1 border-t border-line">
              <Button variant="quiet" onClick={() => setIsEditing(true)} disabled={isEditing}>
                <Icon name="edit" size={18} />
                {t('common.edit')}
              </Button>
              <Button
                variant="quiet"
                className="text-danger"
                onClick={() => {
                  deleteTodo.mutate({ id: todo.id });
                  void navigate(-1);
                }}
              >
                <Icon name="remove" size={18} />
                {t('todo.row.delete')}
              </Button>
            </div>
          </Card>
          {todo.source === undefined ? null : (
            <section aria-label={t('detail.source')}>
              <h2 className={SECTION_LABEL_CLASS_NAME}>{t('detail.source')}</h2>
              <Card padding="none">
                <SourceView source={todo.source} isInitiallyOpen />
              </Card>
            </section>
          )}
          {todo.commitment === undefined ? null : <CommitmentWithSources path={todo.commitment} />}
        </>
      )}
    </article>
  );
}
