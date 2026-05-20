/**
 * Bars CRM. Toggle between two views: list and kanban. The kanban
 * columns map 1:1 to the spec `BarStatus` enum
 * (`lead | contacted | booked | played | cold`); drag a card between
 * columns to update its `status` via `PUT /api/bars/:id`.
 *
 * HTML5 drag suffices for the kanban — the design bundle's "handle
 * pattern" applies to mobile setlist reorder, not the desktop kanban.
 * The stale-bar banner + per-row badge fire from `stale-bar.utils`
 * (closes A20).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Badge } from '../../components/atoms/Badge';
import { Chip } from '../../components/atoms/Chip';
import { Icon } from '../../components/atoms/Icon';
import { cn } from '../../components/atoms/cn.utils';
import { PageHeader } from '../../components/molecules/PageHeader';
import { ApiError, apiRequest } from '../../lib/api-client';
import { formatCapacity } from '../../lib/formatters.utils';
import { countStale, isStale } from '../../lib/stale-bar.utils';
import {
  BAR_STATUSES,
  BAR_STATUS_KEY,
  BLANK_BAR_DRAFT,
  type BarDraftState,
  type BarStatus,
  BarForm,
} from './BarForm';

const barSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(BAR_STATUSES),
  notes: z.string(),
  lastInteractionAt: z.string().nullable(),
  city: z.string().nullable(),
  capacity: z.number().nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
});
const listSchema = z.object({ bars: z.array(barSchema) });
const singleSchema = z.object({ bar: barSchema });

type Bar = z.infer<typeof barSchema>;
type View = 'list' | 'kanban';

function fromBar(bar: Bar): BarDraftState {
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

function payloadFrom(draft: BarDraftState): Record<string, unknown> {
  return {
    name: draft.name.trim(),
    status: draft.status,
    notes: draft.notes,
    city: draft.city.length === 0 ? null : draft.city,
    capacity: draft.capacity.length === 0 ? null : Number(draft.capacity),
    contactName: draft.contactName.length === 0 ? null : draft.contactName,
    contactEmail: draft.contactEmail.length === 0 ? null : draft.contactEmail,
    contactPhone: draft.contactPhone.length === 0 ? null : draft.contactPhone,
  };
}

export function BarsPage(): JSX.Element {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('list');
  const [bars, setBars] = useState<Bar[]>([]);
  const [draft, setDraft] = useState<BarDraftState>(BLANK_BAR_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const body = listSchema.parse(await apiRequest('/api/bars'));
      setBars(body.bars);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const payload = payloadFrom(draft);
    if (typeof payload.name !== 'string' || payload.name.length === 0) return;
    try {
      if (draft.id === null) {
        const created = singleSchema.parse(
          await apiRequest('/api/bars', { method: 'POST', body: payload }),
        );
        setBars((current) => [...current, created.bar]);
      } else {
        const updated = singleSchema.parse(
          await apiRequest(`/api/bars/${draft.id}`, { method: 'PUT', body: payload }),
        );
        setBars((current) =>
          current.map((row) => (row.id === updated.bar.id ? updated.bar : row)),
        );
      }
      setDraft(BLANK_BAR_DRAFT);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      await apiRequest(`/api/bars/${id}`, { method: 'DELETE' });
      setBars((current) => current.filter((row) => row.id !== id));
      if (draft.id === id) setDraft(BLANK_BAR_DRAFT);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const dropOnColumn = async (status: BarStatus, draggedId: string): Promise<void> => {
    try {
      const updated = singleSchema.parse(
        await apiRequest(`/api/bars/${draggedId}`, { method: 'PUT', body: { status } }),
      );
      setBars((current) => current.map((row) => (row.id === updated.bar.id ? updated.bar : row)));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  return (
    <section className="px-9 py-7 pb-20 max-w-[1280px]">
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

      {error !== null ? (
        <p className="text-danger text-sm mb-3" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-ink-400 italic text-sm">{t('common.loading')}</p> : null}
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
          <ul className="flex flex-col gap-1.5">
            {sortedBars.map((bar) => (
              <li
                key={bar.id}
                className={cn(
                  'flex items-center gap-3 bg-bg-elev border border-line rounded-md px-3 py-2 hover:border-line-strong transition-colors',
                  isBarStale(bar) && 'border-warn/40',
                )}
              >
                <button
                  type="button"
                  className="flex-1 text-left text-[13.5px] text-ink-900 cursor-pointer bg-transparent border-0"
                  onClick={() => setDraft(fromBar(bar))}
                >
                  {bar.name}
                </button>
                <Chip tone="default">{t(BAR_STATUS_KEY[bar.status])}</Chip>
                {isBarStale(bar) ? (
                  <Badge tone="warn">{t('bars.staleBadge')}</Badge>
                ) : null}
                <span className="text-xs text-ink-500 hidden md:inline">{bar.city ?? ''}</span>
                <span className="text-xs font-mono text-ink-400 hidden md:inline">
                  {formatCapacity(bar.capacity)}
                </span>
                <button
                  type="button"
                  className="text-ink-400 hover:text-danger text-lg leading-none cursor-pointer bg-transparent border-0 px-1"
                  onClick={() => void remove(bar.id)}
                  aria-label={t('common.delete')}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <BarForm
            draft={draft}
            onChange={setDraft}
            onSubmit={submit}
            onCancel={() => setDraft(BLANK_BAR_DRAFT)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 min-w-[1100px]">
          {BAR_STATUSES.map((status) => (
            <section
              key={status}
              className="bg-bg-sunk rounded-lg p-3 min-h-[480px] flex flex-col gap-2"
              aria-label={t(BAR_STATUS_KEY[status])}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const draggedId = event.dataTransfer.getData('text/plain');
                if (draggedId.length > 0) void dropOnColumn(status, draggedId);
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
                  onClick={() => setDraft(fromBar(bar))}
                >
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink-900 mb-1">
                    {bar.name}
                    {isBarStale(bar) ? (
                      <Badge tone="warn">{t('bars.staleBadge')}</Badge>
                    ) : null}
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
