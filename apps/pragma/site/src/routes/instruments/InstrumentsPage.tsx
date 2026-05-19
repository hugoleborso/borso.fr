/**
 * Instruments admin page. List on the left, edit form on the right
 * when a row is selected. Per the design bundle:
 *  - rows show `name` + a small mono badge with `isHarmonic` state.
 *  - the form's submit button uses the blue accent.
 *
 * Loads via `apiRequest('/api/instruments')`. Mutations rebuild the
 * list from the server response — no optimistic update in v1.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api-client';

const instrumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isHarmonic: z.boolean(),
});
const listResponseSchema = z.object({ instruments: z.array(instrumentSchema) });
const singleResponseSchema = z.object({ instrument: instrumentSchema });

type Instrument = z.infer<typeof instrumentSchema>;

interface DraftState {
  id: string | null;
  name: string;
  isHarmonic: boolean;
}

const BLANK_DRAFT: DraftState = { id: null, name: '', isHarmonic: false };

export function InstrumentsPage(): JSX.Element {
  const { t } = useTranslation();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(BLANK_DRAFT);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const body = listResponseSchema.parse(await apiRequest('/api/instruments'));
      setInstruments(body.instruments);
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

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmed = draft.name.trim();
    if (trimmed.length === 0) return;
    try {
      if (draft.id === null) {
        const created = singleResponseSchema.parse(
          await apiRequest('/api/instruments', {
            method: 'POST',
            body: { name: trimmed, isHarmonic: draft.isHarmonic },
          }),
        );
        setInstruments((current) => [...current, created.instrument]);
      } else {
        const updated = singleResponseSchema.parse(
          await apiRequest(`/api/instruments/${draft.id}`, {
            method: 'PUT',
            body: { name: trimmed, isHarmonic: draft.isHarmonic },
          }),
        );
        setInstruments((current) =>
          current.map((row) => (row.id === updated.instrument.id ? updated.instrument : row)),
        );
      }
      setDraft(BLANK_DRAFT);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      await apiRequest(`/api/instruments/${id}`, { method: 'DELETE' });
      setInstruments((current) => current.filter((row) => row.id !== id));
      if (draft.id === id) setDraft(BLANK_DRAFT);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  return (
    <section className="admin-page">
      <h2 className="admin-page-title">{t('instruments.title')}</h2>
      {error !== null ? <p className="admin-page-error">{error}</p> : null}
      <div className="admin-page-layout">
        <ul className="admin-page-list" aria-label={t('instruments.title')}>
          {loading ? <li className="admin-page-loading">{t('common.loading')}</li> : null}
          {instruments
            .toSorted((left, right) => left.name.localeCompare(right.name))
            .map((row) => (
              <li key={row.id} className="admin-page-row">
                <button
                  type="button"
                  className="admin-page-row-name"
                  onClick={() =>
                    setDraft({ id: row.id, name: row.name, isHarmonic: row.isHarmonic })
                  }
                >
                  {row.name}
                </button>
                <span className="admin-page-row-badge admin-page-row-badge--mono">
                  {row.isHarmonic ? t('instruments.harmonic') : t('instruments.percussive')}
                </span>
                <button
                  type="button"
                  className="admin-page-row-delete"
                  onClick={() => void remove(row.id)}
                  aria-label={t('common.delete')}
                >
                  ×
                </button>
              </li>
            ))}
        </ul>
        <form onSubmit={submit} className="admin-page-form">
          <h3 className="admin-page-form-title">
            {draft.id === null ? t('instruments.newTitle') : t('instruments.editTitle')}
          </h3>
          <label className="admin-page-form-label" htmlFor="instrument-name">
            {t('instruments.name')}
          </label>
          <input
            id="instrument-name"
            type="text"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            className="admin-page-form-input"
            required
            minLength={1}
            maxLength={64}
          />
          <label className="admin-page-form-checkbox">
            <input
              type="checkbox"
              checked={draft.isHarmonic}
              onChange={(event) =>
                setDraft((current) => ({ ...current, isHarmonic: event.target.checked }))
              }
            />
            {t('instruments.isHarmonic')}
          </label>
          <div className="admin-page-form-actions">
            <button type="submit" className="admin-page-form-submit">
              {t('common.save')}
            </button>
            {draft.id !== null ? (
              <button
                type="button"
                className="admin-page-form-cancel"
                onClick={() => setDraft(BLANK_DRAFT)}
              >
                {t('common.cancel')}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
