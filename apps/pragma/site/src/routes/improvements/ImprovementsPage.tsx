/** @Feature improvements */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoGrowTextarea } from '../../components/atoms/AutoGrowTextarea';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { FilterPillGroup } from '../../components/molecules/FilterPillGroup';
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
  readStatus,
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
const TITLE_MAX_LENGTH = 200;

const VOTE_BUTTON_CLASS =
  'flex flex-col items-center justify-center min-w-12 rounded-md border px-2 py-1 leading-tight';

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
  const errorMessage =
    lastError instanceof ApiError ? lastError.message : lastError ? 'unknown-error' : null;

  const filterOptions = [
    { value: ALL_STATUSES, label: t('common.all'), count: improvements.length },
    ...IMPROVEMENT_STATUSES.map((status) => ({
      value: status,
      label: t(selectStatusLabelKey(status)),
      count: filterByStatus(improvements, status).length,
    })),
  ];

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader title={t('improvements.title')} subtitle={t('improvements.subtitle')} />
      {errorMessage === null ? null : (
        <p className="text-danger text-sm mb-3" role="alert">
          {errorMessage}
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
            <li className="text-ink-400 italic text-sm">{t('common.loading')}</li>
          ) : null}
          {visibleImprovements.length === 0 && !list.isLoading ? (
            <li className="text-ink-400 italic text-sm">{t('improvements.empty')}</li>
          ) : null}
          {visibleImprovements.map((row) => (
            <li
              key={row.id}
              className="flex items-start gap-3 bg-bg-elev border border-line rounded-md px-3 py-2 hover:border-line-strong transition-colors"
            >
              <button
                type="button"
                aria-pressed={row.votedByViewer}
                aria-label={t('improvements.voteFor', { title: row.title })}
                onClick={() =>
                  vote.mutate({ id: row.id, intent: selectVoteIntent(row.votedByViewer) })
                }
                className={composeClassName(
                  VOTE_BUTTON_CLASS,
                  row.votedByViewer
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-line text-ink-500 bg-transparent hover:border-line-strong',
                )}
              >
                <span aria-hidden="true" className="text-xs">
                  ▲
                </span>
                <span className="text-sm font-medium">{row.voteCount}</span>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => selectImprovement(row)}
                    className="text-left text-[13.5px] text-ink-900 cursor-pointer bg-transparent border-0 p-0"
                  >
                    {row.title}
                  </button>
                  <Badge tone={row.status === 'shipped' ? 'accent' : 'default'}>
                    {t(selectStatusLabelKey(readStatus(row.status)))}
                  </Badge>
                </div>
                {row.details === '' ? null : (
                  <p className="text-xs text-ink-500 mt-1 mb-0 whitespace-pre-wrap">
                    {row.details}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
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
          className="flex flex-col gap-3 bg-bg-elev border border-line rounded-md p-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <h2 className="text-sm font-medium m-0">
            {selected === null ? t('improvements.newTitle') : t('improvements.editTitle')}
          </h2>
          <form.Field name="title">
            {(field) => (
              <label className="flex flex-col gap-1 text-xs text-ink-500">
                {t('improvements.titleField')}
                <Input
                  value={field.state.value}
                  maxLength={TITLE_MAX_LENGTH}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="details">
            {(field) => (
              <label className="flex flex-col gap-1 text-xs text-ink-500">
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
              <label className="flex flex-col gap-1 text-xs text-ink-500">
                {t('improvements.statusField')}
                <select
                  value={field.state.value}
                  onChange={(event) => field.handleChange(readStatus(event.target.value))}
                  className="min-h-11 rounded-md border border-line-strong bg-bg-elev px-2 text-[13px] text-ink-900"
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
            <Button type="submit" variant="primary">
              {selected === null ? t('common.add') : t('common.save')}
            </Button>
            {selected === null ? null : (
              <Button variant="ghost" onClick={clearSelection}>
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
