import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { CommitmentRow } from '../molecules/CommitmentRow';
import { TodoRow } from '../molecules/TodoRow';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { addDaysToIsoDay, DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { useDeleteTodo, useUpdateTodo } from '../../lib/queries/todos.queries';
import { buildCommitmentHref, buildTodoHref, selectPageName } from '../../lib/wikilinks.core';
import { type CommitmentDirection, selectCommitmentHeadline } from './commitment-board.core';
import { buildAgenda, describeAgendaDay, selectOverdueDay } from './today-agenda.core';
import {
  selectDueIcon,
  selectDueStatus,
  selectDueTone,
  type SchedulableTodo,
} from './todo-list.core';

export interface AgendaCommitment {
  readonly path: string;
  readonly title: string;
  readonly direction: CommitmentDirection | null;
  readonly counterpart?: string;
  readonly counterpartName?: string;
  readonly action?: string;
  readonly dueDate?: string;
}

export interface TodayAgendaProps {
  readonly todos: readonly SchedulableTodo[];
  readonly commitments: readonly AgendaCommitment[];
  readonly today: string;
}

function formatDay(isoDay: string): string {
  return formatShortDay(isoDay, DISPLAY_LOCALE);
}

// @FollowsBlueprint organism-mutation-panel
export function TodayAgenda({ todos, commitments, today }: TodayAgendaProps): JSX.Element | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const tomorrow = addDaysToIsoDay(today, 1);
  const days = buildAgenda(todos, commitments, today, tomorrow);
  if (days.length === 0) return null;
  return (
    <Card padding="none" className="pb-1">
      {days.map((day) => (
        <section key={day.key} aria-label={describeAgendaDay(day, t, formatDay)}>
          <h2 className="m-0 px-4 pt-3 pb-1 text-label text-ink-muted first-letter:uppercase">
            {describeAgendaDay(day, t, formatDay)}
          </h2>
          <ul className="m-0 p-0 list-none px-1">
            {day.entries.map((entry) => {
              const isTodoEntry = entry.kind === 'todo';
              if (isTodoEntry) {
                const { todo } = entry;
                const status = selectDueStatus(todo, today, tomorrow);
                const toggle = (): void => {
                  updateTodo.mutate({ id: todo.id, done: !todo.done });
                };
                const remove = (): void => {
                  deleteTodo.mutate({ id: todo.id });
                };
                return (
                  <TodoRow
                    key={entry.key}
                    text={todo.text}
                    isDone={todo.done}
                    dueLabel={selectOverdueDay(day.bucket, todo.dueDate, formatDay)}
                    dueTone={selectDueTone(status)}
                    dueIcon={selectDueIcon(status)}
                    onToggle={toggle}
                    onOpen={() => void navigate(buildTodoHref(todo.id))}
                    onDelete={remove}
                    onLongPress={() => {
                      openActionSheet({
                        title: todo.text,
                        subject: { kind: 'todo' },
                        actions: [
                          { labelKey: 'todo.row.check', icon: 'check', onSelect: toggle },
                          { labelKey: 'todo.row.delete', icon: 'remove', onSelect: remove },
                        ],
                      });
                    }}
                  />
                );
              }
              const { commitment } = entry;
              const href = buildCommitmentHref(commitment.path);
              const headline = selectCommitmentHeadline(commitment, selectPageName);
              return (
                <CommitmentRow
                  key={entry.key}
                  href={href}
                  variant={headline.variant}
                  lead={headline.lead}
                  text={headline.text}
                  onLongPress={() => {
                    openActionSheet({
                      title: commitment.title,
                      subject: { kind: 'commitment', path: commitment.path },
                      actions: [
                        {
                          labelKey: 'discuss.action.open',
                          icon: 'open',
                          onSelect: () => void navigate(href),
                        },
                      ],
                    });
                  }}
                />
              );
            })}
          </ul>
        </section>
      ))}
    </Card>
  );
}
