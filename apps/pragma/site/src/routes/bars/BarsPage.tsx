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
    <section className="bars-page">
      <header className="catalog-page-header">
        <h2 className="admin-page-title">{t('bars.title')}</h2>
        <div className="bars-view-toggle">
          <button
            type="button"
            className={view === 'list' ? 'is-active' : ''}
            onClick={() => setView('list')}
          >
            {t('bars.viewList')}
          </button>
          <button
            type="button"
            className={view === 'kanban' ? 'is-active' : ''}
            onClick={() => setView('kanban')}
          >
            {t('bars.viewKanban')}
          </button>
        </div>
      </header>
      {error !== null ? <p className="admin-page-error">{error}</p> : null}
      {loading ? <p className="admin-page-loading">{t('common.loading')}</p> : null}
      {staleCount > 0 ? (
        <div className="bars-stale-banner" role="alert">
          {t('bars.staleBanner', { count: staleCount })}
        </div>
      ) : null}

      {view === 'list' ? (
        <div className="admin-page-layout">
          <ul className="admin-page-list">
            {sortedBars.map((bar) => (
              <li
                key={bar.id}
                className={`admin-page-row${isBarStale(bar) ? ' admin-page-row--stale' : ''}`}
              >
                <button
                  type="button"
                  className="admin-page-row-name"
                  onClick={() => setDraft(fromBar(bar))}
                >
                  {bar.name}
                </button>
                <span className={`bar-status bar-status--${bar.status}`}>
                  {t(BAR_STATUS_KEY[bar.status])}
                </span>
                {isBarStale(bar) ? (
                  <span className="bar-stale-badge">{t('bars.staleBadge')}</span>
                ) : null}
                <span className="bar-meta">{bar.city ?? ''}</span>
                <span className="bar-meta">{formatCapacity(bar.capacity)}</span>
                <button
                  type="button"
                  className="admin-page-row-delete"
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
        <div className="bars-kanban">
          {BAR_STATUSES.map((status) => (
            <section
              key={status}
              className={`bars-kanban-column bars-kanban-column--${status}`}
              aria-label={t(BAR_STATUS_KEY[status])}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const draggedId = event.dataTransfer.getData('text/plain');
                if (draggedId.length > 0) void dropOnColumn(status, draggedId);
              }}
            >
              <h3 className="bars-kanban-column-title">{t(BAR_STATUS_KEY[status])}</h3>
              {grouped[status].map((bar) => (
                <button
                  key={bar.id}
                  type="button"
                  className={`bars-kanban-card${isBarStale(bar) ? ' bars-kanban-card--stale' : ''}`}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', bar.id)}
                  onClick={() => setDraft(fromBar(bar))}
                >
                  <div className="bars-kanban-card-name">
                    {bar.name}
                    {isBarStale(bar) ? (
                      <span className="bar-stale-badge">{t('bars.staleBadge')}</span>
                    ) : null}
                  </div>
                  <div className="bars-kanban-card-meta">
                    {bar.city ?? ''} · {formatCapacity(bar.capacity)}
                  </div>
                  {bar.contactName !== null ? (
                    <div className="bars-kanban-card-contact">{bar.contactName}</div>
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
