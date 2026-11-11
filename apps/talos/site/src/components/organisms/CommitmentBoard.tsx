import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { PageTitle } from '../atoms/PageTitle';
import { BackLink } from '../molecules/BackLink';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { SegmentedFilter } from '../molecules/SegmentedFilter';
import { toIsoDay } from '../../lib/calendar-day.utils';
import { useOpenCommitments } from '../../lib/queries/commitments.queries';
import {
  COMMITMENT_FILTERS,
  type CommitmentFilter,
  readCommitmentFilter,
  selectCommitmentFilterLabelKey,
  selectVisibleCommitments,
} from './commitment-board.core';
import { OpenCommitmentRow } from './OpenCommitmentRow';

const DIRECTION_PARAMETER = 'direction';

// @FollowsBlueprint organism-query-owning
export function CommitmentBoard(): JSX.Element {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const commitments = useOpenCommitments();
  const filter = readCommitmentFilter(searchParams.get(DIRECTION_PARAMETER));
  const visible = selectVisibleCommitments(commitments.data?.items ?? [], filter);
  const today = toIsoDay(new Date());
  return (
    <>
      <BackLink to="/" label={t('common.back')} />
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
              {visible.map((commitment) => (
                <OpenCommitmentRow key={commitment.path} commitment={commitment} today={today} />
              ))}
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
