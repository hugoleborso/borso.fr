import type { TodoListName } from '@domain/todo-list.core';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { TodoRow } from '../molecules/TodoRow';
import {
  addDaysToIsoDay,
  DISPLAY_LOCALE,
  formatShortDay,
  toIsoDay,
} from '../../lib/calendar-day.utils';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { useDeleteTodo, useTodos, useUpdateTodo } from '../../lib/queries/todos.queries';
import { buildTodoHref } from '../../lib/wikilinks.core';
import { TodoEditForm } from './TodoEditForm';
import {
  buildTodoListHeading,
  countOpenTodos,
  describeDue,
  selectDueIcon,
  selectDueStatus,
  selectDueTone,
  selectTodoEmptyLabelKey,
  selectTodoListChoiceLabelKey,
  selectVisibleTodos,
  type TodoFilter,
} from './todo-list.core';

const SECTION_LABEL_CLASS_NAME = 'm-0 px-1 pb-1 text-label text-ink-muted first-letter:uppercase';

export interface TodoListSectionProps {
  readonly list: TodoListName;
  readonly filter: TodoFilter;
  readonly isNamed: boolean;
}

// @FollowsBlueprint organism-mutation-panel
export function TodoListSection({ list, filter, isNamed }: TodoListSectionProps): JSX.Element {
  const { t } = useTranslation();
  const todos = useTodos(list);
  const updateTodo = useUpdateTodo(list);
  const deleteTodo = useDeleteTodo(list);
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = toIsoDay(new Date());
  const tomorrow = addDaysToIsoDay(today, 1);
  const allTodos = todos.data?.items ?? [];
  const visibleTodos = selectVisibleTodos(allTodos, filter);

  const name = t(selectTodoListChoiceLabelKey(list));
  const openCount = t('todo.open-count', { count: countOpenTodos(allTodos) });
  const heading = buildTodoListHeading(filter, isNamed ? name : null, openCount);

  return (
    <section aria-label={name}>
      {heading === null ? null : <h2 className={SECTION_LABEL_CLASS_NAME}>{heading}</h2>}
      {todos.data === undefined ? (
        <QueryState isPending={todos.isPending} onRetry={() => void todos.refetch()} />
      ) : (
        <Card padding="none" className="px-2">
          <ul className="m-0 p-0 list-none">
            {visibleTodos.map((todo) => {
              const status = selectDueStatus(todo, today, tomorrow);
              const isEditing = todo.id === editingId;
              const toggle = (): void => {
                updateTodo.mutate({ id: todo.id, done: !todo.done });
              };
              const edit = (): void => {
                setEditingId(todo.id);
              };
              const remove = (): void => {
                deleteTodo.mutate({ id: todo.id });
              };
              return isEditing ? (
                <TodoEditForm
                  key={todo.id}
                  text={todo.text}
                  dueDate={todo.dueDate}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => {
                    setEditingId(null);
                    updateTodo.mutate({ id: todo.id, ...patch });
                  }}
                />
              ) : (
                <TodoRow
                  key={todo.id}
                  text={todo.text}
                  isDone={todo.done}
                  dueLabel={describeDue(
                    todo.dueDate,
                    status,
                    (key, date) => t(key, { date }),
                    (isoDay) => formatShortDay(isoDay, DISPLAY_LOCALE),
                  )}
                  dueTone={selectDueTone(status)}
                  dueIcon={selectDueIcon(status)}
                  onToggle={toggle}
                  onOpen={() => void navigate(buildTodoHref(todo.id, list))}
                  onDelete={remove}
                  onLongPress={() => {
                    openActionSheet({
                      title: todo.text,
                      subject: { kind: 'todo', list },
                      actions: [
                        {
                          labelKey: todo.done ? 'todo.row.uncheck' : 'todo.row.check',
                          icon: todo.done ? 'undo' : 'check',
                          onSelect: toggle,
                        },
                        { labelKey: 'common.edit', icon: 'edit', onSelect: edit },
                        { labelKey: 'todo.row.delete', icon: 'remove', onSelect: remove },
                      ],
                    });
                  }}
                />
              );
            })}
          </ul>
          {visibleTodos.length === 0 ? (
            <EmptyState icon="check" label={t(selectTodoEmptyLabelKey(filter))} />
          ) : null}
        </Card>
      )}
    </section>
  );
}
