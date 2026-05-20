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
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { PageHeader } from '../../components/molecules/PageHeader';
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
    <section className="px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader title={t('instruments.title')} subtitle={t('instruments.subtitle')} />
      {error !== null ? (
        <p className="text-danger text-sm mb-3" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-5 items-start">
        <ul className="flex flex-col gap-1.5" aria-label={t('instruments.title')}>
          {loading ? (
            <li className="text-ink-400 italic text-sm">{t('common.loading')}</li>
          ) : null}
          {instruments
            .toSorted((left, right) => left.name.localeCompare(right.name))
            .map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 bg-bg-elev border border-line rounded-md px-3 py-2 hover:border-line-strong transition-colors"
              >
                <button
                  type="button"
                  className="flex-1 text-left text-[13.5px] text-ink-900 cursor-pointer bg-transparent border-0"
                  onClick={() =>
                    setDraft({ id: row.id, name: row.name, isHarmonic: row.isHarmonic })
                  }
                >
                  {row.name}
                </button>
                <Badge tone="mono">
                  {row.isHarmonic ? t('instruments.harmonic') : t('instruments.percussive')}
                </Badge>
                <button
                  type="button"
                  className="text-ink-400 hover:text-danger text-lg leading-none cursor-pointer bg-transparent border-0 px-1"
                  onClick={() => void remove(row.id)}
                  aria-label={t('common.delete')}
                >
                  ×
                </button>
              </li>
            ))}
        </ul>
        <Card className="flex flex-col gap-3">
          <h3 className="font-display italic text-2xl text-ink-900 m-0">
            {draft.id === null ? t('instruments.newTitle') : t('instruments.editTitle')}
          </h3>
          <form onSubmit={submit} className="flex flex-col gap-2.5">
            <label
              className="text-[11px] tracking-wider uppercase text-ink-400 font-medium"
              htmlFor="instrument-name"
            >
              {t('instruments.name')}
            </label>
            <Input
              id="instrument-name"
              type="text"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              required
              minLength={1}
              maxLength={64}
            />
            <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.isHarmonic}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, isHarmonic: event.target.checked }))
                }
              />
              {t('instruments.isHarmonic')}
            </label>
            <div className="flex gap-2 mt-2">
              <Button type="submit" variant="accent">
                {t('common.save')}
              </Button>
              {draft.id !== null ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDraft(BLANK_DRAFT)}
                >
                  {t('common.cancel')}
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>
    </section>
  );
}
