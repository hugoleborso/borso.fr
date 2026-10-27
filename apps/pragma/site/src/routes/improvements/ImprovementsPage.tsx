/** @Feature improvements */

import { IMPROVEMENT_TITLE_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoGrowTextarea } from '../../components/atoms/AutoGrowTextarea';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Chip } from '../../components/atoms/Chip';
import { Icon, type IconName } from '../../components/atoms/Icon';
import { Input } from '../../components/atoms/Input';
import { inputVariants } from '../../components/atoms/input.variants';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { FilterPillGroup } from '../../components/molecules/FilterPillGroup';
import { ListRow } from '../../components/molecules/ListRow';
import { PageHeader } from '../../components/molecules/PageHeader';
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

interface SelectedImprovement {
  id: string;
  title: string;
  details: string;
  status: ImprovementStatus;
}

const DEFAULT_STATUS: ImprovementStatus = 'idea';
const ALL_STATUSES: StatusFilter = 'all';
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
  const [selected, setSelected] = useState<SelectedImprovement | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUSES);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      title: selected?.title ?? '',
      details: selected?.details ?? '',
      status: selected?.status ?? DEFAULT_STATUS,
    },
    onSubmit: async ({ value }) => {
      const title = value.title.trim();
      if (title.length === 0) return;
      if (selected === null) {
        await create.mutateAsync({ title, details: value.details, status: value.status });
      } else {
        await update.mutateAsync({
          id: selected.id,
          title,
          details: value.details,
          status: value.status,
        });
      }
      setSelected(null);
      form.reset();
    },
  });

  const selectImprovement = (row: ImprovementRow): void => {
    const status = readStatus(row.status);
    setSelected({ id: row.id, title: row.title, details: row.details, status });
    form.setFieldValue('title', row.title);
    form.setFieldValue('details', row.details);
    form.setFieldValue('status', status);
  };

  const clearSelection = (): void => {
    setSelected(null);
    form.reset();
  };

  const applyDeletionEffect = {
    'keep-form': (): void => undefined,
    'clear-form': clearSelection,
  } as const;

  const removeImprovement = (improvementId: string): void => {
    remove.mutate({ id: improvementId });
    applyDeletionEffect[selectImprovementDeletionEffect(selected?.id ?? null, improvementId)]();
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
      <PageHeader title={t('improvements.title')} />
      {lastError === null ? null : (
        <p className="text-danger text-meta mb-3" role="alert">
          {t(selectErrorMessageKey(failureStatus))}
        </p>
      )}
      <FilterPillGroup
        className="mb-4"
        options={filterOptions}
        value={statusFilter}
        onChange={setStatusFilter}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
        <ul
          className="flex flex-col gap-1.5 list-none p-0 m-0"
          aria-label={t('improvements.title')}
        >
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
                  <ListRow onClick={() => selectImprovement(row)} className="w-auto text-meta">
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
        <form
          className="flex flex-col gap-3 bg-leaf border border-rule rounded-md p-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <h2 className="text-meta font-medium m-0">
            {selected === null ? t('improvements.newTitle') : t('improvements.editTitle')}
          </h2>
          <form.Field name="title">
            {(field) => (
              <label className="flex flex-col gap-1 text-meta text-ink-soft">
                {t('improvements.titleField')}
                <Input
                  value={field.state.value}
                  maxLength={IMPROVEMENT_TITLE_MAX_LENGTH}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="details">
            {(field) => (
              <label className="flex flex-col gap-1 text-meta text-ink-soft">
                {t('improvements.detailsField')}
                <AutoGrowTextarea
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="status">
            {(field) => (
              <label className="flex flex-col gap-1 text-meta text-ink-soft">
                {t('improvements.statusField')}
                <select
                  value={field.state.value}
                  onChange={(event) => field.handleChange(readStatus(event.target.value))}
                  className={inputVariants({ size: 'md' })}
                >
                  {IMPROVEMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(selectStatusLabelKey(status))}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </form.Field>
          <div className="flex gap-2">
            <Button icon="check" type="submit" variant="primary">
              {selected === null ? t('common.add') : t('common.save')}
            </Button>
            {selected === null ? null : (
              <Button icon="close" variant="quiet" onClick={clearSelection}>
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </form>
      </div>
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
    </section>
  );
}
