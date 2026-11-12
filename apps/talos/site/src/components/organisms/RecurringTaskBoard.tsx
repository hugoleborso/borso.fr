import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { PageTitle } from '../atoms/PageTitle';
import { BackLink } from '../molecules/BackLink';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { RecurringTaskRow } from '../molecules/RecurringTaskRow';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { useRecurringTasks } from '../../lib/queries/recurring-tasks.queries';
import { countDueTasks, orderRecurringTasks } from './recurring-task-board.core';

// @FollowsBlueprint organism-query-owning
export function RecurringTaskBoard(): JSX.Element {
  const { t } = useTranslation();
  const recurring = useRecurringTasks();
  const tasks = orderRecurringTasks(recurring.data?.tasks ?? []);
  const dueCount = countDueTasks(tasks);
  return (
    <>
      <BackLink to="/" label={t('common.back')} />
      <PageTitle
        subtitle={
          recurring.data === undefined ? undefined : (
            <>
              {t('recurring.count', { count: tasks.length })} ·{' '}
              <span className={dueCount > 0 ? 'font-semibold text-danger' : undefined}>
                {t('recurring.due-count', { count: dueCount })}
              </span>
            </>
          )
        }
      >
        {t('recurring.title')}
      </PageTitle>
      {recurring.data === undefined ? (
        <QueryState isPending={recurring.isPending} onRetry={() => void recurring.refetch()} />
      ) : (
        <Card padding="none" className="px-1">
          <ul className="m-0 p-0 list-none">
            {tasks.map((task) => (
              <RecurringTaskRow
                key={task.id}
                title={task.title}
                cadence={task.cadence}
                isDue={task.isDue}
                stateLabel={t(task.isDue ? 'recurring.state.due' : 'recurring.state.up-to-date')}
                lastRun={
                  task.lastRunOn === null
                    ? t('recurring.never')
                    : formatShortDay(task.lastRunOn, DISPLAY_LOCALE)
                }
                lastRunLabel={t('recurring.last-run')}
                nextRun={formatShortDay(task.nextRunOn, DISPLAY_LOCALE)}
                nextRunLabel={t('recurring.next-run')}
                what={task.what}
                routine={t('recurring.routine', { routine: task.routine })}
                onLongPress={() => {
                  openActionSheet({
                    title: task.title,
                    subject: { kind: 'recurring' },
                    details: [task.what],
                  });
                }}
              />
            ))}
          </ul>
          {tasks.length === 0 ? <EmptyState icon="scan" label={t('recurring.empty')} /> : null}
        </Card>
      )}
    </>
  );
}
