/**
 * Instruments admin page. List on the left, edit form on the right
 * when a row is selected.
 *
 * Reads go through `useInstrumentsList()` (TanStack Query); writes
 * through the matching create / update / delete mutation hooks. Each
 * write invalidates the list query on success — pessimistic update.
 * The selected-instrument-for-edit state stays in `useState` because
 * it's UI state, not server state.
 */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { PageHeader } from '../../components/molecules/PageHeader';
import { ApiError } from '../../lib/api';
import {
  useCreateInstrument,
  useDeleteInstrument,
  useInstrumentsList,
  useUpdateInstrument,
} from '../../lib/queries/instruments';

interface SelectedInstrument {
  id: string;
  name: string;
  isHarmonic: boolean;
}

const INSTRUMENT_NAME_MIN_LENGTH = 1;
const INSTRUMENT_NAME_MAX_LENGTH = 64;

export function InstrumentsPage(): JSX.Element {
  const { t } = useTranslation();
  const list = useInstrumentsList();
  const create = useCreateInstrument();
  const update = useUpdateInstrument();
  const remove = useDeleteInstrument();
  const [selected, setSelected] = useState<SelectedInstrument | null>(null);

  const form = useForm({
    defaultValues: { name: selected?.name ?? '', isHarmonic: selected?.isHarmonic ?? false },
    onSubmit: async ({ value }) => {
      const trimmed = value.name.trim();
      if (trimmed.length === 0) return;
      if (selected === null) {
        await create.mutateAsync({ name: trimmed, isHarmonic: value.isHarmonic });
      } else {
        await update.mutateAsync({
          id: selected.id,
          name: trimmed,
          isHarmonic: value.isHarmonic,
        });
      }
      setSelected(null);
      form.reset();
    },
  });

  const selectInstrument = (row: SelectedInstrument): void => {
    setSelected(row);
    form.setFieldValue('name', row.name);
    form.setFieldValue('isHarmonic', row.isHarmonic);
  };

  const clearSelection = (): void => {
    setSelected(null);
    form.reset();
  };

  const instruments = list.data?.instruments ?? [];
  const lastError: unknown =
    list.error ?? create.error ?? update.error ?? remove.error ?? null;
  const errorMessage =
    lastError instanceof ApiError ? lastError.message : lastError ? 'unknown-error' : null;

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader title={t('instruments.title')} subtitle={t('instruments.subtitle')} />
      {errorMessage !== null ? (
        <p className="text-danger text-sm mb-3" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-5 items-start">
        <ul className="flex flex-col gap-1.5" aria-label={t('instruments.title')}>
          {list.isLoading ? (
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
                  onClick={() => selectInstrument(row)}
                >
                  {row.name}
                </button>
                <Badge tone="mono">
                  {row.isHarmonic ? t('instruments.harmonic') : t('instruments.percussive')}
                </Badge>
                <button
                  type="button"
                  className="text-ink-400 hover:text-danger text-lg leading-none cursor-pointer bg-transparent border-0 px-1"
                  onClick={() => {
                    remove.mutate({ id: row.id });
                    if (selected?.id === row.id) clearSelection();
                  }}
                  aria-label={t('common.delete')}
                >
                  ×
                </button>
              </li>
            ))}
        </ul>
        <Card className="flex flex-col gap-3">
          <h3 className="font-display italic text-2xl text-ink-900 m-0">
            {selected === null ? t('instruments.newTitle') : t('instruments.editTitle')}
          </h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
            className="flex flex-col gap-2.5"
          >
            <label
              className="text-[11px] tracking-wider uppercase text-ink-400 font-medium"
              htmlFor="instrument-name"
            >
              {t('instruments.name')}
            </label>
            <form.Field name="name">
              {(field) => (
                <Input
                  id="instrument-name"
                  type="text"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  required
                  minLength={INSTRUMENT_NAME_MIN_LENGTH}
                  maxLength={INSTRUMENT_NAME_MAX_LENGTH}
                />
              )}
            </form.Field>
            <form.Field name="isHarmonic">
              {(field) => (
                <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.state.value}
                    onChange={(event) => field.handleChange(event.target.checked)}
                    onBlur={field.handleBlur}
                  />
                  {t('instruments.isHarmonic')}
                </label>
              )}
            </form.Field>
            <div className="flex gap-2 mt-2">
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    variant="accent"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {t('common.save')}
                  </Button>
                )}
              </form.Subscribe>
              {selected !== null ? (
                <Button type="button" variant="ghost" onClick={clearSelection}>
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
