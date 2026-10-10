import type { TodoListName } from '@domain/todo-list.core';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { PageTitle } from '../atoms/PageTitle';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { SegmentedFilter } from '../molecules/SegmentedFilter';
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
import { TodoQuickAdd } from './TodoQuickAdd';
import {
  countOpenTodos,
  describeDue,
  selectDueIcon,
  selectDueStatus,
  selectDueTone,
  selectTodoEmptyLabelKey,
  selectTodoFilterLabelKey,
  selectTodoListTitleKey,
  selectVisibleTodos,
  TODO_FILTERS,
  type TodoFilter,
} from './todo-list.core';

export interface TodoBoardProps {
  readonly list: TodoListName;
}

// @FollowsBlueprint organism-mutation-panel
export function TodoBoard({ list }: TodoBoardProps): JSX.Element {
  const { t } = useTranslation();
  const todos = useTodos(list);
  const updateTodo = useUpdateTodo(list);
  const deleteTodo = useDeleteTodo(list);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TodoFilter>('open');
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = toIsoDay(new Date());
  const tomorrow = addDaysToIsoDay(today, 1);
  const allTodos = todos.data?.items ?? [];
  const visibleTodos = selectVisibleTodos(allTodos, filter);

  return (
    <>
      <PageTitle subtitle={t('todo.open-count', { count: countOpenTodos(allTodos) })}>
        {t(selectTodoListTitleKey(list))}
      </PageTitle>
      <div className="flex flex-col gap-4 pb-16">
        <SegmentedFilter
          label={t('todo.filter.label')}
          options={TODO_FILTERS.map((value) => ({
            value,
            label: t(selectTodoFilterLabelKey(value)),
          }))}
          selected={filter}
          onSelected={setFilter}
        />
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
      </div>
      <TodoQuickAdd list={list} />
    </>
  );
}
