/** @Feature improvements */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../components/atoms/Badge';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { Chip } from '../../components/atoms/Chip';
import { Icon, type IconName } from '../../components/atoms/Icon';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { FilterPillGroup } from '../../components/molecules/FilterPillGroup';
import { ListRow } from '../../components/molecules/ListRow';
import { PageHeader } from '../../components/molecules/PageHeader';
import {
  ImprovementFormSheet,
  type ImprovementFormValues,
} from '../../components/organisms/ImprovementFormSheet';
import { ApiError } from '../../lib/api.client';
import {
  type ImprovementRow,
  useCreateImprovement,
  useDeleteImprovement,
  useImprovementsList,
  useUpdateImprovement,
  useVoteOnImprovement,
} from '../../lib/queries/improvements.queries';
import { selectVoteIntent } from '../../lib/queries/improvements.utils';
import {
  IMPROVEMENT_STATUSES,
  type ImprovementStatus,
  type StatusFilter,
  filterByStatus,
  type WriteFailureStatus,
  readStatus,
  selectErrorMessageKey,
  selectImprovementDeletionEffect,
  selectStatusLabelKey,
} from './improvements-page.core';

interface EditedImprovement {
  readonly improvementId: string | null;
  readonly values: ImprovementFormValues;
}

const DEFAULT_STATUS: ImprovementStatus = 'idea';
const ALL_STATUSES: StatusFilter = 'all';
const NEW_IMPROVEMENT: EditedImprovement = {
  improvementId: null,
  values: { title: '', details: '', status: DEFAULT_STATUS },
};
const IMPROVEMENT_STATUS_ICON = {
  idea: 'bulb',
  planned: 'calendar',
  building: 'edit',
  shipped: 'check',
  declined: 'close',
} as const satisfies Readonly<Record<ImprovementStatus, IconName>>;

export function ImprovementsPage(): JSX.Element {
  const { t } = useTranslation();
  const list = useImprovementsList();
  const create = useCreateImprovement();
  const update = useUpdateImprovement();
  const remove = useDeleteImprovement();
  const vote = useVoteOnImprovement();
  const [edited, setEdited] = useState<EditedImprovement | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUSES);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);

  const saveImprovement = async (values: ImprovementFormValues): Promise<void> => {
    const improvementId = edited?.improvementId ?? null;
    if (improvementId === null) {
      await create.mutateAsync(values);
    } else {
      await update.mutateAsync({ id: improvementId, ...values });
    }
    setEdited(null);
  };

  const editImprovement = (row: ImprovementRow): void => {
    setEdited({
      improvementId: row.id,
      values: { title: row.title, details: row.details, status: readStatus(row.status) },
    });
  };

  const applyDeletionEffect = {
    'keep-form': (): void => undefined,
    'clear-form': (): void => setEdited(null),
  } as const;

  const removeImprovement = (improvementId: string): void => {
    remove.mutate({ id: improvementId });
    applyDeletionEffect[
      selectImprovementDeletionEffect(edited?.improvementId ?? null, improvementId)
    ]();
  };

  const improvements = list.data?.improvements ?? [];
  const visibleImprovements = filterByStatus(improvements, statusFilter);
  const lastError: unknown =
    list.error ?? create.error ?? update.error ?? remove.error ?? vote.error ?? null;
  const failureStatus: WriteFailureStatus = lastError instanceof ApiError ? lastError.status : null;

  const filterOptions = [
    {
      value: ALL_STATUSES,
      label: t('common.all'),
      icon: 'catalog' as const,
      count: improvements.length,
    },
    ...IMPROVEMENT_STATUSES.map((status) => ({
      value: status,
      label: t(selectStatusLabelKey(status)),
      icon: IMPROVEMENT_STATUS_ICON[status],
      count: filterByStatus(improvements, status).length,
    })),
  ];

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px]">
      <PageHeader back={{ to: '/band', label: t('band.title') }} title={t('improvements.title')}>
        <FilterPillGroup options={filterOptions} value={statusFilter} onChange={setStatusFilter} />
      </PageHeader>
      {lastError === null ? null : (
        <p className="text-danger text-meta mb-3" role="alert">
          {t(selectErrorMessageKey(failureStatus))}
        </p>
      )}
      <ul className="flex flex-col gap-1.5 list-none p-0 m-0" aria-label={t('improvements.title')}>
        {list.isLoading ? (
          <li className="text-ink-soft italic text-meta">{t('common.loading')}</li>
        ) : null}
        {visibleImprovements.length === 0 && !list.isLoading ? (
          <li className="text-ink-soft italic text-meta">{t('improvements.empty')}</li>
        ) : null}
        {visibleImprovements.map((row) => (
          <li
            key={row.id}
            className="flex items-start gap-3 bg-leaf border border-rule rounded-md px-3 py-2 hover:border-rule-strong transition-colors"
          >
            <Chip
              pressed={row.votedByViewer}
              aria-label={t('improvements.voteFor', { title: row.title })}
              onPress={() =>
                vote.mutate({ id: row.id, intent: selectVoteIntent(row.votedByViewer) })
              }
              className="shrink-0 gap-1"
            >
              <Icon name="chevD" className="rotate-180" />
              <span className="font-medium">{row.voteCount}</span>
            </Chip>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ListRow onClick={() => editImprovement(row)} className="w-auto text-meta">
                  {row.title}
                </ListRow>
                <Badge tone={row.status === 'shipped' ? 'accent' : 'default'}>
                  {t(selectStatusLabelKey(readStatus(row.status)))}
                </Badge>
              </div>
              {row.details === '' ? null : (
                <p className="text-meta text-ink-soft mt-1 mb-0 whitespace-pre-wrap">
                  {row.details}
                </p>
              )}
            </div>
            <Button
              icon="trash"
              variant="quiet"
              size="sm"
              onClick={() => setPendingDeletionId(row.id)}
              aria-label={t('improvements.deleteFor', { title: row.title })}
            >
              {t('common.delete')}
            </Button>
          </li>
        ))}
      </ul>
      {edited === null ? null : (
        <ImprovementFormSheet
          key={edited.improvementId ?? 'new'}
          isNew={edited.improvementId === null}
          initialValues={edited.values}
          onSave={saveImprovement}
          onClose={() => setEdited(null)}
        />
      )}
      {pendingDeletionId === null ? null : (
        <ConfirmDialog
          question={t('improvements.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onConfirm={() => {
            removeImprovement(pendingDeletionId);
            setPendingDeletionId(null);
          }}
          onCancel={() => setPendingDeletionId(null)}
        />
      )}
      <BottomActions>
        <Button variant="primary" size="lg" icon="plus" onClick={() => setEdited(NEW_IMPROVEMENT)}>
          {t('improvements.newTitle')}
        </Button>
      </BottomActions>
    </section>
  );
}
