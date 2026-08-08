/**
 * Bars CRM. Toggle between two views: list and kanban. The kanban
 * columns map 1:1 to the spec `BarStatus` enum
 * (`lead | contacted | booked | played | cold`); drag a card between
 * columns to update its `status` via the bar-update mutation.
 *
 * HTML5 drag suffices for the kanban — the design bundle's "handle
 * pattern" applies to mobile setlist reorder, not the desktop kanban.
 * The stale-bar banner + per-row badge fire from `stale-bar.utils`.
 */

import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../components/atoms/Badge';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { Icon } from '../../components/atoms/Icon';
import { PageHeader } from '../../components/molecules/PageHeader';
import { BarsList, type BarsListRow } from '../../components/organisms/BarsList';
import { ApiError } from '../../lib/api';
import { formatCapacity } from '../../lib/formatters.utils';
import { useBarsList, useCreateBar, useDeleteBar, useUpdateBar } from '../../lib/queries/bars';
import { countStale, isStale } from '../../lib/stale-bar.utils';
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
  type BarsView,
  groupBarsByStatus,
  selectBarWriteIntent,
  selectDragDropIntent,
  selectFormAfterDeletion,
  selectFormForBar,
  selectToggleState,
  sortBarsByName,
} from './bars-page.core';

const NO_BARS: readonly BarRow[] = [];

const VIEW_TOGGLE_CLASS = {
  active: 'bg-bg-elev text-ink-900 shadow-[0_1px_2px_rgba(26,22,18,0.06)]',
  inactive: 'bg-transparent text-ink-500 hover:text-ink-700',
} as const;

const KANBAN_CARD_TONE = {
  stale: 'border-warn/40',
  fresh: '',
} as const;

export function BarsPage(): JSX.Element {
  const { t } = useTranslation();
  const [view, setView] = useState<BarsView>('list');
  const [formInitial, setFormInitial] = useState<BarFormInitial>(BLANK_BAR_FORM);
  const [localError, setLocalError] = useState<string | null>(null);
  const barsQuery = useBarsList();
  const createBar = useCreateBar();
  const updateBar = useUpdateBar();
  const deleteBar = useDeleteBar();

  const bars = useMemo<readonly BarRow[]>(() => barsQuery.data?.bars ?? NO_BARS, [barsQuery.data]);
  const sortedBars = useMemo(() => sortBarsByName(bars), [bars]);

  const now = useMemo(() => new Date(), []);
  const staleCount = useMemo(() => countStale(bars, now), [bars, now]);
  const isBarStale = useCallback((bar: BarRow): boolean => isStale(bar, now), [now]);

  const grouped = useMemo(() => groupBarsByStatus(sortedBars), [sortedBars]);

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
      onSuccess: () => setFormInitial(BLANK_BAR_FORM),
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

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader
        title={t('bars.title')}
        subtitle={t('bars.subtitle')}
        actions={
          <div className="inline-flex gap-1 p-[3px] bg-bg-sunk rounded-lg">
            <button
              type="button"
              onClick={() => setView('list')}
              className={composeClassName(
                'px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors',
                VIEW_TOGGLE_CLASS[selectToggleState(view, 'list')],
              )}
            >
              {t('bars.viewList')}
            </button>
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={composeClassName(
                'px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors',
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
      {staleCount > 0 ? (
        <div
          className="flex items-center gap-2 bg-warn-soft text-warn px-4 py-2.5 rounded-md text-sm mb-4"
          role="alert"
        >
          <Icon name="warn" size={16} />
          {t('bars.staleBanner', { count: staleCount })}
        </div>
      ) : null}

      {view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-5 items-start">
          <BarsList
            bars={listRows}
            statusLabel={(status) => t(BAR_STATUS_KEY[status])}
            onSelect={selectBar}
            onRemove={removeBar}
          />
          <BarForm
            key={formInitial.id ?? 'new'}
            initial={formInitial}
            onSubmit={saveBar}
            onCancel={() => setFormInitial(BLANK_BAR_FORM)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 overflow-x-auto">
          {BAR_STATUSES.map((status) => (
            <section
              key={status}
              className="bg-bg-sunk rounded-lg p-3 min-h-[480px] flex flex-col gap-2"
              aria-label={t(BAR_STATUS_KEY[status])}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                moveBarToStatus(status, event.dataTransfer.getData('text/plain'));
              }}
            >
              <h3 className="font-medium text-[11px] tracking-wider uppercase text-ink-500 mx-1 mt-1 mb-1.5 flex items-center gap-2">
                {t(BAR_STATUS_KEY[status])}
                <span className="font-mono text-ink-400">{grouped[status].length}</span>
              </h3>
              {grouped[status].map((bar) => (
                <button
                  key={bar.id}
                  type="button"
                  className={composeClassName(
                    'block w-full text-left bg-bg-elev border border-line rounded-md px-3 py-2.5 cursor-grab hover:border-line-strong transition-colors',
                    KANBAN_CARD_TONE[isBarStale(bar) ? 'stale' : 'fresh'],
                  )}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', bar.id)}
                  onClick={() => selectBar(bar.id)}
                >
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink-900 mb-1">
                    {bar.name}
                    {isBarStale(bar) ? <Badge tone="warn">{t('bars.staleBadge')}</Badge> : null}
                  </div>
                  <div className="text-[10.5px] font-mono text-ink-400 tracking-wide">
                    {bar.city ?? ''} · {formatCapacity(bar.capacity)}
                  </div>
                  {bar.contactName === null ? null : (
                    <div className="text-[11.5px] text-ink-500 mt-1.5">{bar.contactName}</div>
                  )}
                </button>
              ))}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
