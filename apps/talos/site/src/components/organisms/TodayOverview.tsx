import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buttonVariants } from '../atoms/button.variants';
import { Icon } from '../atoms/Icon';
import { PageTitle } from '../atoms/PageTitle';
import { PendingProposalsCard } from '../molecules/PendingProposalsCard';
import { QueryState } from '../molecules/QueryState';
import { DISPLAY_LOCALE, formatLongDay, toIsoDay } from '../../lib/calendar-day.utils';
import { useToday } from '../../lib/queries/today.queries';
import { NotificationsPrompt } from './NotificationsPrompt';
import { hasPendingProposals } from './proposal-board.core';
import { TodayBrief } from './TodayBrief';
import { TodayFocus } from './TodayFocus';
import { TodayTodos } from './TodayTodos';

// @FollowsBlueprint organism-query-owning
export function TodayOverview(): JSX.Element {
  const { t } = useTranslation();
  const today = useToday();
  const date = today.data?.date ?? toIsoDay(new Date());
  const hasPending = hasPendingProposals(today.data?.pendingProposalCount ?? 0);
  return (
    <>
      <PageTitle
        subtitle={formatLongDay(date, DISPLAY_LOCALE)}
        trailing={
          <Link
            to="/settings"
            aria-label={t('settings.open')}
            className={buttonVariants({ variant: 'quiet', size: 'icon' })}
          >
            <Icon name="settings" size={22} />
          </Link>
        }
      >
        {t('today.title')}
      </PageTitle>
      {today.data === undefined ? (
        <QueryState isPending={today.isPending} onRetry={() => void today.refetch()} />
      ) : (
        <div className="flex flex-col gap-6">
          <NotificationsPrompt />
          <TodayFocus items={today.data.focus.items} today={date} />
          <TodayBrief brief={today.data.brief} />
          <TodayTodos todos={today.data.todos} today={date} />
          {hasPending ? <PendingProposalsCard count={today.data.pendingProposalCount} /> : null}
        </div>
      )}
    </>
  );
}
