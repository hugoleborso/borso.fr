import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { PageTitle } from '../atoms/PageTitle';
import { BackLink } from '../molecules/BackLink';
import { EmptyState } from '../molecules/EmptyState';
import { HistoryRow } from '../molecules/HistoryRow';
import { QueryState } from '../molecules/QueryState';
import { SegmentedFilter } from '../molecules/SegmentedFilter';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { DISPLAY_LOCALE } from '../../lib/calendar-day.utils';
import { useHistory } from '../../lib/queries/history.queries';
import {
  HISTORY_FILTERS,
  type HistoryFilter,
  readHistoryFilter,
  selectHistoryFilterLabelKey,
  selectHistoryRows,
} from './history-board.core';

const FILTER_PARAMETER = 'view';

// @FollowsBlueprint organism-query-owning
export function HistoryBoard(): JSX.Element {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const history = useHistory();
  const filter = readHistoryFilter(searchParams.get(FILTER_PARAMETER));
  const rows = selectHistoryRows(
    history.data ?? { briefs: [], reviews: [] },
    filter,
    DISPLAY_LOCALE,
  );
  return (
    <>
      <BackLink to="/" label={t('common.back')} />
      <PageTitle>{t('history.title')}</PageTitle>
      <div className="flex flex-col gap-4">
        <SegmentedFilter
          label={t('history.title')}
          options={HISTORY_FILTERS.map((value) => ({
            value,
            label: t(selectHistoryFilterLabelKey(value)),
          }))}
          selected={filter}
          onSelected={(next: HistoryFilter) => {
            setSearchParams({ [FILTER_PARAMETER]: next }, { replace: true });
          }}
        />
        {history.data === undefined ? (
          <QueryState isPending={history.isPending} onRetry={() => void history.refetch()} />
        ) : (
          <Card padding="none" className="px-1">
            <ul className="m-0 p-0 list-none">
              {rows.map((row) => (
                <HistoryRow
                  key={row.key}
                  href={row.href}
                  icon={row.icon}
                  title={row.title}
                  {...(row.caption === undefined ? {} : { caption: row.caption })}
                  onLongPress={() => {
                    openActionSheet({
                      title: row.isBrief
                        ? t('today.brief.sheet-title', { date: row.title })
                        : row.title,
                      subject: row.subject,
                    });
                  }}
                />
              ))}
            </ul>
            {rows.length === 0 ? <EmptyState icon="activity" label={t('history.empty')} /> : null}
          </Card>
        )}
      </div>
    </>
  );
}
