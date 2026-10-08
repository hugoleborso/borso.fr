import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { PageTitle } from '../atoms/PageTitle';
import { CommitmentRow } from '../molecules/CommitmentRow';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { SegmentedFilter } from '../molecules/SegmentedFilter';
import { openActionSheet } from '../../lib/action-sheet.hook';
import {
  addDaysToIsoDay,
  DISPLAY_LOCALE,
  formatShortDay,
  toIsoDay,
} from '../../lib/calendar-day.utils';
import { useOpenCommitments } from '../../lib/queries/commitments.queries';
import { buildPageHref, selectPageName } from '../../lib/wikilinks.core';
import {
  COMMITMENT_FILTERS,
  type CommitmentFilter,
  readCommitmentFilter,
  selectCommitmentFilterLabelKey,
  selectDirectionIcon,
  selectVisibleCommitments,
} from './commitment-board.core';
import { describeDue, selectDueStatus, selectDueTone } from './todo-list.core';

const DIRECTION_PARAMETER = 'direction';

function formatDay(isoDay: string): string {
  return formatShortDay(isoDay, DISPLAY_LOCALE);
}

// @FollowsBlueprint organism-query-owning
export function CommitmentBoard(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const commitments = useOpenCommitments();
  const filter = readCommitmentFilter(searchParams.get(DIRECTION_PARAMETER));
  const visible = selectVisibleCommitments(commitments.data?.items ?? [], filter);
  const today = toIsoDay(new Date());
  const tomorrow = addDaysToIsoDay(today, 1);
  return (
    <>
      <PageTitle subtitle={String(visible.length)}>{t('commitments.title')}</PageTitle>
      <div className="flex flex-col gap-4">
        <SegmentedFilter
          label={t('commitments.title')}
          options={COMMITMENT_FILTERS.map((value) => ({
            value,
            label: t(selectCommitmentFilterLabelKey(value)),
          }))}
          selected={filter}
          onSelected={(next: CommitmentFilter) => {
            setSearchParams({ [DIRECTION_PARAMETER]: next }, { replace: true });
          }}
        />
        {commitments.data === undefined ? (
          <QueryState
            isPending={commitments.isPending}
            onRetry={() => void commitments.refetch()}
          />
        ) : (
          <Card padding="none" className="px-1">
            <ul className="m-0 p-0 list-none">
              {visible.map((commitment) => {
                const href = buildPageHref(commitment.path);
                const status = selectDueStatus(
                  { done: false, dueDate: commitment.dueDate },
                  today,
                  tomorrow,
                );
                const dueLabel = describeDue(
                  commitment.dueDate,
                  status,
                  (key, date) => t(key, { date }),
                  formatDay,
                );
                return (
                  <CommitmentRow
                    key={commitment.path}
                    href={href}
                    title={commitment.title}
                    icon={selectDirectionIcon(commitment.direction)}
                    directionLabel={t(
                      selectCommitmentFilterLabelKey(commitment.direction ?? 'all'),
                    )}
                    {...(commitment.counterpart === undefined
                      ? {}
                      : { counterpartLabel: selectPageName(commitment.counterpart) })}
                    {...(dueLabel === null ? {} : { dueLabel, dueTone: selectDueTone(status) })}
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
            {visible.length === 0 ? (
              <EmptyState icon="commitment" label={t('commitments.empty')} />
            ) : null}
          </Card>
        )}
      </div>
    </>
  );
}
