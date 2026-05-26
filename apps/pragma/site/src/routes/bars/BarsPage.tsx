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
import { cn } from '../../components/atoms/cn.utils';
import { Icon } from '../../components/atoms/Icon';
import { PageHeader } from '../../components/molecules/PageHeader';
import { BarsList, type BarsListRow } from '../../components/organisms/BarsList';
import { ApiError } from '../../lib/api';
import { formatCapacity } from '../../lib/formatters.utils';
import { useBarsList, useCreateBar, useDeleteBar, useUpdateBar } from '../../lib/queries/bars';
import { countStale, isStale } from '../../lib/stale-bar.utils';
import {
  BAR_STATUS_KEY,
  BAR_STATUSES,
  BarForm,
  type BarFormInitial,
  type BarFormSubmitPayload,
  type BarStatus,
  BLANK_BAR_FORM,
} from './BarForm';

type Bar = NonNullable<ReturnType<typeof useBarsList>['data']>['bars'][number];
type View = 'list' | 'kanban';

function initialFromBar(bar: Bar): BarFormInitial {
  return {
    id: bar.id,
    name: bar.name,
    status: bar.status,
    notes: bar.notes,
    city: bar.city ?? '',
    capacity: bar.capacity === null ? '' : String(bar.capacity),
    contactName: bar.contactName ?? '',
    contactEmail: bar.contactEmail ?? '',
    contactPhone: bar.contactPhone ?? '',
  };
}

export function BarsPage(): JSX.Element {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('list');
  const [formInitial, setFormInitial] = useState<BarFormInitial>(BLANK_BAR_FORM);
  const [localError, setLocalError] = useState<string | null>(null);
  const barsQuery = useBarsList();
  const createBar = useCreateBar();
  const updateBar = useUpdateBar();
  const deleteBar = useDeleteBar();

  const bars = barsQuery.data?.bars ?? [];
  const sortedBars = useMemo(
    () => bars.toSorted((left, right) => left.name.localeCompare(right.name)),
    [bars],
  );

  const now = useMemo(() => new Date(), []);
  const staleCount = useMemo(() => countStale(bars, now), [bars, now]);
  const isBarStale = useCallback((bar: Bar): boolean => isStale(bar, now), [now]);

  const grouped = useMemo(() => {
    const out: Record<BarStatus, Bar[]> = {
      lead: [],
      contacted: [],
      booked: [],
      played: [],
      cold: [],
    };
    for (const bar of sortedBars) out[bar.status].push(bar);
    return out;
  }, [sortedBars]);

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

  const handleFormSubmit = (id: string | null, payload: BarFormSubmitPayload): void => {
    if (payload.name.length === 0) return;
    const onError = (error: Error): void =>
      setLocalError(error instanceof ApiError ? error.message : 'unknown-error');
    if (id === null) {
      createBar.mutate(payload, {
        onSuccess: () => setFormInitial(BLANK_BAR_FORM),
        onError,
      });
    } else {
      updateBar.mutate(
        { id, ...payload },
        { onSuccess: () => setFormInitial(BLANK_BAR_FORM), onError },
      );
    }
  };

  const handleRemove = (id: string): void => {
    deleteBar.mutate(
      { id },
      {
        onSuccess: () => {
          if (formInitial.id === id) setFormInitial(BLANK_BAR_FORM);
        },
        onError: (error) =>
          setLocalError(error instanceof ApiError ? error.message : 'unknown-error'),
      },
    );
  };

  const handleDropOnColumn = (status: BarStatus, draggedId: string): void => {
    updateBar.mutate({ id: draggedId, status });
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
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors',
                view === 'list'
                  ? 'bg-bg-elev text-ink-900 shadow-[0_1px_2px_rgba(26,22,18,0.06)]'
                  : 'bg-transparent text-ink-500 hover:text-ink-700',
              )}
            >
              {t('bars.viewList')}
            </button>
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors',
                view === 'kanban'
                  ? 'bg-bg-elev text-ink-900 shadow-[0_1px_2px_rgba(26,22,18,0.06)]'
                  : 'bg-transparent text-ink-500 hover:text-ink-700',
              )}
            >
              {t('bars.viewKanban')}
            </button>
          </div>
        }
      />

      {displayError !== null ? (
        <p className="text-danger text-sm mb-3" role="alert">
          {displayError}
        </p>
      ) : null}
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
            onSelect={(id) => {
              const bar = bars.find((entry) => entry.id === id);
              if (bar !== undefined) setFormInitial(initialFromBar(bar));
            }}
            onRemove={handleRemove}
          />
          <BarForm
            key={formInitial.id ?? 'new'}
            initial={formInitial}
            onSubmit={handleFormSubmit}
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
                const draggedId = event.dataTransfer.getData('text/plain');
                if (draggedId.length > 0) handleDropOnColumn(status, draggedId);
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
                  className={cn(
                    'block w-full text-left bg-bg-elev border border-line rounded-md px-3 py-2.5 cursor-grab hover:border-line-strong transition-colors',
                    isBarStale(bar) && 'border-warn/40',
                  )}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', bar.id)}
                  onClick={() => setFormInitial(initialFromBar(bar))}
                >
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink-900 mb-1">
                    {bar.name}
                    {isBarStale(bar) ? <Badge tone="warn">{t('bars.staleBadge')}</Badge> : null}
                  </div>
                  <div className="text-[10.5px] font-mono text-ink-400 tracking-wide">
                    {bar.city ?? ''} · {formatCapacity(bar.capacity)}
                  </div>
                  {bar.contactName !== null ? (
                    <div className="text-[11.5px] text-ink-500 mt-1.5">{bar.contactName}</div>
                  ) : null}
                </button>
              ))}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
