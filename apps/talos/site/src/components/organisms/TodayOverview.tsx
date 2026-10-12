import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buttonVariants } from '../atoms/button.variants';
import { Icon } from '../atoms/Icon';
import { PageTitle } from '../atoms/PageTitle';
import { QueryState } from '../molecules/QueryState';
import { DISPLAY_LOCALE, formatLongDay, toIsoDay } from '../../lib/calendar-day.utils';
import { useToday } from '../../lib/queries/today.queries';
import { NotificationsPrompt } from './NotificationsPrompt';
import { ScanStatus } from './ScanStatus';
import { countOverdueTodos } from './today-agenda.core';
import { TodayActivity } from './TodayActivity';
import { TodayAgenda } from './TodayAgenda';
import { TodayBirthdays } from './TodayBirthdays';
import { TodayBrief } from './TodayBrief';
import { TodayCounters } from './TodayCounters';
import { TodayFocus } from './TodayFocus';
import { TodayShortcuts } from './TodayShortcuts';

// @FollowsBlueprint organism-query-owning
export function TodayOverview(): JSX.Element {
  const { t } = useTranslation();
  const today = useToday();
  const date = today.data?.date ?? toIsoDay(new Date());
  return (
    <>
      <PageTitle
        trailing={
          <div className="flex items-center shrink-0">
            <ScanStatus lastRuns={today.data?.lastRuns ?? null} />
            <Link
              to="/settings"
              aria-label={t('settings.open')}
              className={buttonVariants({ variant: 'quiet', size: 'icon' })}
            >
              <Icon name="settings" size={22} />
            </Link>
          </div>
        }
      >
        <span className="block text-(length:--text-focus) leading-(--text-focus--line-height) first-letter:uppercase">
          {formatLongDay(date, DISPLAY_LOCALE)}
        </span>
      </PageTitle>
      {today.data === undefined ? (
        <QueryState isPending={today.isPending} onRetry={() => void today.refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          <NotificationsPrompt />
          <TodayBirthdays birthdays={today.data.soonBirthdays} />
          <TodayCounters
            pendingProposalCount={today.data.pendingProposalCount}
            overdueTodoCount={countOverdueTodos(today.data.todos, date)}
            owedCommitmentCount={today.data.commitmentCounts.owed}
            awaitedCommitmentCount={today.data.commitmentCounts.awaited}
          />
          <TodayShortcuts
            readyDraftCount={today.data.readyDraftCount}
            reconnectCount={today.data.reconnectCount}
          />
          <TodayFocus items={today.data.focus.items} today={date} />
          {today.data.brief === null ? null : <TodayBrief brief={today.data.brief} />}
          <TodayAgenda todos={today.data.todos} commitments={today.data.commitments} today={date} />
          <TodayActivity entries={today.data.activity} today={date} />
        </div>
      )}
    </>
  );
}
