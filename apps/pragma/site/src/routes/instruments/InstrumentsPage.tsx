/**
 * Instruments admin page. List on the left, edit form on the right
 * when a row is selected.
 *
 * Reads go through `useInstrumentsList()` (TanStack Query); writes
 * through the matching create / update / delete mutation hooks. Each
 * write applies its change to the list cache optimistically and rolls
 * that change back if the request fails. The selected-instrument-for-edit
 * state stays in `useState` because it's UI state, not server state.
 *
 * Deleting an instrument asks first: it leaves every lineup that holds it and
 * there is no undo.
 */

import { INSTRUMENT_FAMILIES, type InstrumentFamily } from '@domain/instrument.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { Input } from '../../components/atoms/Input';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { PageHeader } from '../../components/molecules/PageHeader';
import { ApiError } from '../../lib/api.client';
import {
  useCreateInstrument,
  useDeleteInstrument,
  useInstrumentsList,
  useUpdateInstrument,
} from '../../lib/queries/instruments.queries';
import {
  INSTRUMENT_FAMILY_LABEL_KEY,
  selectInstrumentDeletionEffect,
} from './instruments-page.core';

interface SelectedInstrument {
  id: string;
  name: string;
  family: InstrumentFamily;
}

/**
 * The name button stretches over the whole row through an `::after` overlay, so
 * the family badge and the space beside it open the instrument like the name
 * does instead of being a dead strip a finger lands on. The delete button sits
 * above the overlay on its own layer.
 */
const ROW_OPENING_BUTTON_CLASS =
  'flex-1 min-h-11 text-left text-[13.5px] text-ink-900 cursor-pointer bg-transparent border-0 ' +
  'after:absolute after:inset-0';

const DEFAULT_NEW_INSTRUMENT_FAMILY: InstrumentFamily = 'harmonic';
const INSTRUMENT_NAME_MIN_LENGTH = 1;
const INSTRUMENT_NAME_MAX_LENGTH = 64;

// @FollowsBlueprint route-list-page
export function InstrumentsPage(): JSX.Element {
  const { t } = useTranslation();
  const list = useInstrumentsList();
  const create = useCreateInstrument();
  const update = useUpdateInstrument();
  const remove = useDeleteInstrument();
  const [selected, setSelected] = useState<SelectedInstrument | null>(null);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: selected?.name ?? '',
      family: selected?.family ?? DEFAULT_NEW_INSTRUMENT_FAMILY,
    },
    onSubmit: async ({ value }) => {
      const trimmed = value.name.trim();
      if (trimmed.length === 0) return;
      if (selected === null) {
        await create.mutateAsync({ name: trimmed, family: value.family });
      } else {
        await update.mutateAsync({ id: selected.id, name: trimmed, family: value.family });
      }
      setSelected(null);
      form.reset();
    },
  });

  const selectInstrument = (row: SelectedInstrument): void => {
    setSelected(row);
    form.setFieldValue('name', row.name);
    form.setFieldValue('family', row.family);
  };

  const clearSelection = (): void => {
    setSelected(null);
    form.reset();
  };

  const applyDeletionEffect = {
    'keep-form': (): void => undefined,
    'clear-form': clearSelection,
  } as const;

  const removeInstrument = (instrumentId: string): void => {
    remove.mutate({ id: instrumentId });
    applyDeletionEffect[selectInstrumentDeletionEffect(selected?.id ?? null, instrumentId)]();
  };

  const instruments = list.data?.instruments ?? [];
  const lastError: unknown = list.error ?? create.error ?? update.error ?? remove.error ?? null;
  const errorMessage =
    lastError instanceof ApiError ? lastError.message : lastError ? 'unknown-error' : null;

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader title={t('instruments.title')} subtitle={t('instruments.subtitle')} />
      {errorMessage === null ? null : (
        <p className="text-danger text-sm mb-3" role="alert">
          {errorMessage}
        </p>
      )}
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
                className="relative flex items-center gap-3 bg-bg-elev border border-line rounded-md px-3 py-2 hover:border-line-strong transition-colors"
              >
                <button
                  type="button"
                  className={ROW_OPENING_BUTTON_CLASS}
                  onClick={() => selectInstrument(row)}
                >
                  {row.name}
                </button>
                <Badge tone="mono">{t(INSTRUMENT_FAMILY_LABEL_KEY[row.family])}</Badge>
                <button
                  type="button"
                  className="relative z-10 inline-flex items-center justify-center min-w-11 min-h-11 text-ink-400 hover:text-danger text-lg leading-none cursor-pointer bg-transparent border-0 px-1"
                  onClick={() => setPendingDeletionId(row.id)}
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
              className="text-xs tracking-wider uppercase text-ink-400 font-medium"
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
            <span className="text-xs tracking-wider uppercase text-ink-400 font-medium">
              {t('instruments.family')}
            </span>
            <form.Field name="family">
              {(field) => (
                <div className="flex flex-wrap gap-1.5" role="group">
                  {INSTRUMENT_FAMILIES.map((family) => (
                    <button
                      key={family}
                      type="button"
                      aria-pressed={field.state.value === family}
                      onClick={() => field.handleChange(family)}
                      className={composeClassName(
                        'inline-flex items-center min-h-11 px-3 rounded-full border text-[12.5px] cursor-pointer transition-colors',
                        field.state.value === family
                          ? 'bg-accent-soft border-accent text-accent font-medium'
                          : 'bg-bg border-line text-ink-500 hover:border-line-strong',
                      )}
                    >
                      {t(INSTRUMENT_FAMILY_LABEL_KEY[family])}
                    </button>
                  ))}
                </div>
              )}
            </form.Field>
            <p className="text-xs text-ink-500 m-0">{t('instruments.familyHint')}</p>
            <div className="flex gap-2 mt-2">
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" variant="accent" disabled={!canSubmit || isSubmitting}>
                    {t('common.save')}
                  </Button>
                )}
              </form.Subscribe>
              {selected === null ? null : (
                <Button type="button" variant="ghost" onClick={clearSelection}>
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
      {pendingDeletionId === null ? null : (
        <ConfirmDialog
          question={t('instruments.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onConfirm={() => {
            removeInstrument(pendingDeletionId);
            setPendingDeletionId(null);
          }}
          onCancel={() => setPendingDeletionId(null)}
        />
      )}
    </section>
  );
}
