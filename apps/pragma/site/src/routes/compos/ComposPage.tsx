/** @Feature compositions */

import { nextStatusAfterToggle } from '@domain/task-status.core';
import { selectCompositions } from '@domain/song-origin.core';
import type { JSX } from 'react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { ChartKindIcon } from '../../components/molecules/ChartKindIcon';
import { PageHeader } from '../../components/molecules/PageHeader';
import { StatusChip } from '../../components/molecules/StatusChip';
import { CompositionDetail } from '../../components/organisms/CompositionDetail';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { ApiError } from '../../lib/api.client';
import { formatDueDate, isDueDatePast } from '../../lib/formatters.utils';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { useSignedChartUrl } from '../../lib/queries/uploads.queries';
import { useDeleteTask, useTasksList, useUpdateTask } from '../../lib/queries/tasks.queries';
import { selectTasksOfSong, type TaskShape } from '../tasks/tasks-page.core';
import { countLineupMembers, selectComposition, selectUploadedChart } from './compos-page.core';

const NO_ROWS: readonly never[] = [];

const ROW_CLASS =
  'relative flex items-center gap-2.5 w-full text-left bg-bg-elev border rounded-md px-3 py-2 ' +
  'cursor-pointer transition-colors min-h-11';

// @FollowsBlueprint route-list-page
export function ComposPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const songsQuery = useSongsList();
  const membersQuery = useMembersList();
  const instrumentsQuery = useInstrumentsList();
  const tasksQuery = useTasksList();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);

  const compositions = useMemo(
    () => selectCompositions(songsQuery.data?.songs ?? NO_ROWS),
    [songsQuery.data],
  );
  const selected = useMemo(
    () => selectComposition(compositions, selectedId),
    [compositions, selectedId],
  );
  const members = membersQuery.data?.members ?? NO_ROWS;
  const instruments = instrumentsQuery.data?.instruments ?? NO_ROWS;
  const lineupMembers = useMemo(
    () => members.map((member) => ({ id: member.id, name: member.firstName, color: member.color })),
    [members],
  );
  const tasksOfSelected = useMemo<readonly TaskShape[]>(
    () =>
      selected === null
        ? NO_ROWS
        : selectTasksOfSong(tasksQuery.data?.tasks ?? NO_ROWS, selected.id),
    [tasksQuery.data, selected],
  );

  const uploadedChart = selectUploadedChart(selected?.chart ?? null);
  const signedChartUrlQuery = useSignedChartUrl(uploadedChart?.s3Key ?? null);
  const chartError = signedChartUrlQuery.error;

  const queryError: unknown = songsQuery.error ?? tasksQuery.error ?? null;
  const errorMessage =
    queryError instanceof ApiError
      ? queryError.message
      : queryError === null
        ? null
        : 'unknown-error';

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader title={t('compos.title')} subtitle={t('compos.subtitle')} />
      {errorMessage === null ? null : (
        <p className="text-danger text-sm mb-3" role="alert">
          {errorMessage}
        </p>
      )}
      {songsQuery.isLoading ? (
        <p className="text-ink-400 italic text-sm">{t('common.loading')}</p>
      ) : null}
      {!songsQuery.isLoading && compositions.length === 0 ? (
        <p className="text-ink-500 text-sm">{t('compos.empty')}</p>
      ) : null}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
        <ul className="flex flex-col gap-1.5 list-none p-0 m-0" aria-label={t('compos.title')}>
          {compositions.map((composition) => (
            <li key={composition.id}>
              <button
                type="button"
                onClick={() => setSelectedId(composition.id)}
                aria-current={selected?.id === composition.id ? 'true' : undefined}
                className={composeClassName(
                  ROW_CLASS,
                  selected?.id === composition.id
                    ? 'border-accent text-ink-900'
                    : 'border-line text-ink-700 hover:border-line-strong',
                )}
              >
                <span className="flex-1 min-w-0 truncate text-[13.5px]">{composition.title}</span>
                <ChartKindIcon kind={composition.chart?.kind ?? null} />
                <span className="font-mono text-xs text-ink-500">
                  {countLineupMembers(composition.defaultLineup)}
                </span>
                <StatusChip status={composition.status} />
              </button>
            </li>
          ))}
        </ul>
        {selected === null ? null : (
          <CompositionDetail
            composition={selected}
            uploadedChart={uploadedChart}
            signedChartUrl={signedChartUrlQuery.data?.getUrl ?? null}
            chartErrorMessage={chartError instanceof ApiError ? chartError.message : null}
            members={lineupMembers}
            instruments={instruments}
            tasks={tasksOfSelected}
            dueLabelOf={(task) => formatDueDate(task.dueDate, i18n.language)}
            isOverdue={(task) => isDueDatePast(task.dueDate, nowEpochMs)}
            onToggleTaskDone={(task) =>
              updateTask.mutate({ id: task.id, status: nextStatusAfterToggle(task.status) })
            }
            onOpenTask={() => void navigate('/tasks')}
            onDeleteTask={(task) => deleteTask.mutate({ id: task.id })}
          />
        )}
      </div>
    </section>
  );
}
