/**
 * Bars CRM. Toggle between two views: list and kanban. The kanban
 * columns map 1:1 to the spec `BarStatus` enum
 * (`lead | contacted | booked | played | cold`); drag a card between
 * columns to update its `status` via the bar-update mutation.
 *
 * The kanban moves cards with HTML5 drag and drop, which touch input does not
 * fire, so it is a desktop-only view: below `lg` the toggle is hidden and
 * `selectVisibleBarsView` forces the list, whose form carries the status
 * field. The stale-bar banner + per-row badge fire from
 * `domain/bar-staleness.core`.
 *
 * Deleting a bar asks first — it takes the contact details and the follow-up
 * history with it and there is no undo — and a successful write bumps the
 * counter feeding the form's key, so the blank form remounts empty rather than
 * keeping what it just submitted and writing it twice.
 */

import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { Icon } from '../../components/atoms/Icon';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { PageHeader } from '../../components/molecules/PageHeader';
import {
  BREAKPOINT_BELOW_LG,
  useIsMediaQueryMatching,
} from '../../components/molecules/useIsMediaQueryMatching';
import { BarsKanban } from '../../components/organisms/BarsKanban';
import { BarsList, type BarsListRow } from '../../components/organisms/BarsList';
import { ApiError } from '../../lib/api';
import { isPositiveCount } from '../../lib/counts.utils';
import { useBarsList, useCreateBar, useDeleteBar, useUpdateBar } from '../../lib/queries/bars';
import { countStale, isStale } from '@domain/bar-staleness.core';
import { BarForm } from './BarForm';
import {
  BAR_STATUS_KEY,
  BAR_STATUSES,
  type BarFormInitial,
  type BarFormSubmitPayload,
  type BarStatus,
  BLANK_BAR_FORM,
} from './bar-form.core';
import {
  applyBarWriteIntent,
  type BarRow,
  buildBarFormKey,
  type BarsView,
  buildKanbanCardsByStatus,
  groupBarsByStatus,
  selectBarWriteIntent,
  selectDragDropIntent,
  selectFormAfterDeletion,
  selectFormForBar,
  selectToggleState,
  selectVisibleBarsView,
  sortBarsByName,
} from './bars-page.core';

const NO_BARS: readonly BarRow[] = [];

const VIEW_TOGGLE_CLASS = {
  active: 'bg-bg-elev text-ink-900 shadow-[0_1px_2px_rgba(26,22,18,0.06)]',
  inactive: 'bg-transparent text-ink-500 hover:text-ink-700',
} as const;

// @FollowsBlueprint route-list-page
export function BarsPage(): JSX.Element {
  const { t } = useTranslation();
  const [view, setView] = useState<BarsView>('list');
  const [formInitial, setFormInitial] = useState<BarFormInitial>(BLANK_BAR_FORM);
  const [writeCount, setWriteCount] = useState<number>(0);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const isNarrow = useIsMediaQueryMatching(BREAKPOINT_BELOW_LG);
  const barsQuery = useBarsList();
  const createBar = useCreateBar();
  const updateBar = useUpdateBar();
  const deleteBar = useDeleteBar();

  const bars = useMemo<readonly BarRow[]>(() => barsQuery.data?.bars ?? NO_BARS, [barsQuery.data]);
  const sortedBars = useMemo(() => sortBarsByName(bars), [bars]);

  const now = useMemo(() => new Date(), []);
  const staleCount = useMemo(() => countStale(bars, now), [bars, now]);
  const hasStaleBars = isPositiveCount(staleCount);
  const isBarStale = useCallback((bar: BarRow): boolean => isStale(bar, now), [now]);

  const grouped = useMemo(() => groupBarsByStatus(sortedBars), [sortedBars]);
  const kanbanCardsByStatus = useMemo(
    () => buildKanbanCardsByStatus(grouped, isBarStale),
    [grouped, isBarStale],
  );

  const queryError = barsQuery.error instanceof ApiError ? barsQuery.error.message : null;
  const displayError = localError ?? queryError;

  const listRows = useMemo<BarsListRow[]>(
    () =>
      sortedBars.map((bar) => ({
        id: bar.id,
        name: bar.name,
        status: bar.status,
        city: bar.city,
        capacity: bar.capacity,
        isStale: isBarStale(bar),
      })),
    [sortedBars, isBarStale],
  );

  const reportError = (error: Error): void => {
    setLocalError(error instanceof ApiError ? error.message : 'unknown-error');
  };

  const saveBar = (id: string | null, payload: BarFormSubmitPayload): void => {
    const mutationOptions = {
      onSuccess: () => {
        setFormInitial(BLANK_BAR_FORM);
        setWriteCount((current) => current + 1);
      },
      onError: reportError,
    };
    applyBarWriteIntent(selectBarWriteIntent(id, payload), {
      skip: (): void => undefined,
      create: (input) => createBar.mutate(input, mutationOptions),
      update: (input) => updateBar.mutate(input, mutationOptions),
    });
  };

  const removeBar = (barId: string): void => {
    deleteBar.mutate(
      { id: barId },
      {
        onSuccess: () =>
          setFormInitial((current) => selectFormAfterDeletion(current, barId, BLANK_BAR_FORM)),
        onError: reportError,
      },
    );
  };

  const selectBar = (barId: string): void => {
    setFormInitial((current) => selectFormForBar(bars, barId, current));
  };

  const moveBarToStatus = (status: BarStatus, draggedId: string): void => {
    const dropByIntent = {
      ignore: (): void => undefined,
      move: (): void => updateBar.mutate({ id: draggedId, status }),
    } as const;
    dropByIntent[selectDragDropIntent(draggedId)]();
  };

  const panelByView: Readonly<Record<BarsView, JSX.Element>> = {
    list: (
      <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-5 items-start">
        <BarsList
          bars={listRows}
          statusLabel={(status) => t(BAR_STATUS_KEY[status])}
          onSelect={selectBar}
          onRemove={setPendingDeletionId}
        />
        <BarForm
          key={buildBarFormKey(formInitial, writeCount)}
          initial={formInitial}
          onSubmit={saveBar}
          onCancel={() => setFormInitial(BLANK_BAR_FORM)}
        />
      </div>
    ),
    kanban: (
      <BarsKanban
        statuses={BAR_STATUSES}
        cardsByStatus={kanbanCardsByStatus}
        statusLabel={(status) => t(BAR_STATUS_KEY[status])}
        onSelect={selectBar}
        onMoveToStatus={moveBarToStatus}
      />
    ),
  };

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader
        title={t('bars.title')}
        subtitle={t('bars.subtitle')}
        actions={
          <div className="hidden lg:inline-flex gap-1 p-[3px] bg-bg-sunk rounded-lg">
            <button
              type="button"
              onClick={() => setView('list')}
              className={composeClassName(
                'inline-flex items-center min-h-11 px-3 rounded-md text-xs font-medium cursor-pointer transition-colors',
                VIEW_TOGGLE_CLASS[selectToggleState(view, 'list')],
              )}
            >
              {t('bars.viewList')}
            </button>
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={composeClassName(
                'inline-flex items-center min-h-11 px-3 rounded-md text-xs font-medium cursor-pointer transition-colors',
                VIEW_TOGGLE_CLASS[selectToggleState(view, 'kanban')],
              )}
            >
              {t('bars.viewKanban')}
            </button>
          </div>
        }
      />

      {displayError === null ? null : (
        <p className="text-danger text-sm mb-3" role="alert">
          {displayError}
        </p>
      )}
      {barsQuery.isLoading ? (
        <p className="text-ink-400 italic text-sm">{t('common.loading')}</p>
      ) : null}
      {hasStaleBars ? (
        <div
          className="flex items-center gap-2 bg-warn-soft text-warn px-4 py-2.5 rounded-md text-sm mb-4"
          role="alert"
        >
          <Icon name="warn" size={16} />
          {t('bars.staleBanner', { count: staleCount })}
        </div>
      ) : null}

      {panelByView[selectVisibleBarsView(view, isNarrow)]}
      {pendingDeletionId === null ? null : (
        <ConfirmDialog
          question={t('bars.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onConfirm={() => {
            removeBar(pendingDeletionId);
            setPendingDeletionId(null);
          }}
          onCancel={() => setPendingDeletionId(null)}
        />
      )}
    </section>
  );
}
