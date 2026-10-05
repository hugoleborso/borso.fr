import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { SectionTitle } from '../atoms/SectionTitle';
import { EmptyState } from '../molecules/EmptyState';
import { TodoRow } from '../molecules/TodoRow';
import { addDaysToIsoDay, DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { useUpdateTodo } from '../../lib/queries/todos.queries';
import {
  describeDue,
  selectDueIcon,
  selectDueStatus,
  selectDueTone,
  type SchedulableTodo,
} from './todo-list.core';

export interface TodayTodosProps {
  readonly todos: readonly (SchedulableTodo & { readonly commitment?: string })[];
  readonly today: string;
}

// @FollowsBlueprint organism-mutation-panel
export function TodayTodos({ todos, today }: TodayTodosProps): JSX.Element {
  const { t } = useTranslation();
  const updateTodo = useUpdateTodo();
  const tomorrow = addDaysToIsoDay(today, 1);
  return (
    <Card>
      <section>
        <SectionTitle
          trailing={
            <Link
              to="/todos"
              className="inline-flex items-center min-h-9 text-body-sm font-semibold text-bronze no-underline"
            >
              {t('today.todos.all')}
            </Link>
          }
        >
          {t('today.todos.title')}
        </SectionTitle>
        <ul className="m-0 p-0 list-none -mx-2">
          {todos.map((todo) => {
            const status = selectDueStatus(todo, today, tomorrow);
            return (
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
                hasCommitment={todo.commitment !== undefined}
                onToggle={() => updateTodo.mutate({ id: todo.id, done: !todo.done })}
              />
            );
          })}
        </ul>
        {todos.length === 0 ? <EmptyState icon="check" title={t('today.todos.empty')} /> : null}
      </section>
    </Card>
  );
}
