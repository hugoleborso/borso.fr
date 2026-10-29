/** @Feature instruments */

import { FALLBACK_INSTRUMENT_ICON, type InstrumentFamily } from '@domain/instrument.core';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { PageHeader } from '../../components/molecules/PageHeader';
import {
  InstrumentFormSheet,
  type InstrumentFormValues,
} from '../../components/organisms/InstrumentFormSheet';
import { InstrumentsList } from '../../components/organisms/InstrumentsList';
import { ApiError } from '../../lib/api.client';
import {
  useCreateInstrument,
  useDeleteInstrument,
  useInstrumentsList,
  useReorderInstruments,
  useUpdateInstrument,
} from '../../lib/queries/instruments.queries';
import {
  INSTRUMENT_FAMILY_LABEL_KEY,
  selectInstrumentDeletionEffect,
} from './instruments-page.core';

interface EditedInstrument {
  readonly instrumentId: string | null;
  readonly values: InstrumentFormValues;
}

const DEFAULT_NEW_INSTRUMENT_FAMILY: InstrumentFamily = 'harmonic';
const NEW_INSTRUMENT: EditedInstrument = {
  instrumentId: null,
  values: { name: '', family: DEFAULT_NEW_INSTRUMENT_FAMILY, icon: FALLBACK_INSTRUMENT_ICON },
};
const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint route-list-page
export function InstrumentsPage(): JSX.Element {
  const { t } = useTranslation();
  const list = useInstrumentsList();
  const create = useCreateInstrument();
  const update = useUpdateInstrument();
  const remove = useDeleteInstrument();
  const reorder = useReorderInstruments();
  const [edited, setEdited] = useState<EditedInstrument | null>(null);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);

  const saveInstrument = async (values: InstrumentFormValues): Promise<void> => {
    const instrumentId = edited?.instrumentId ?? null;
    if (instrumentId === null) {
      await create.mutateAsync(values);
    } else {
      await update.mutateAsync({ id: instrumentId, ...values });
    }
    setEdited(null);
  };

  const instruments = useMemo(() => list.data?.instruments ?? NO_ROWS, [list.data]);

  const rows = useMemo(
    () =>
      instruments.map((instrument) => ({
        id: instrument.id,
        name: instrument.name,
        icon: instrument.icon,
        familyLabel: t(INSTRUMENT_FAMILY_LABEL_KEY[instrument.family]),
      })),
    [instruments, t],
  );

  const editInstrument = (instrumentId: string): void => {
    const row = instruments.find((instrument) => instrument.id === instrumentId);
    if (row === undefined) return;
    setEdited({
      instrumentId: row.id,
      values: { name: row.name, family: row.family, icon: row.icon },
    });
  };

  const applyDeletionEffect = {
    'keep-form': (): void => undefined,
    'clear-form': (): void => setEdited(null),
  } as const;

  const removeInstrument = (instrumentId: string): void => {
    remove.mutate({ id: instrumentId });
    applyDeletionEffect[
      selectInstrumentDeletionEffect(edited?.instrumentId ?? null, instrumentId)
    ]();
  };

  const lastError: unknown =
    list.error ?? create.error ?? update.error ?? remove.error ?? reorder.error ?? null;
  const errorMessage =
    lastError instanceof ApiError ? lastError.message : lastError ? 'unknown-error' : null;

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 max-w-3xl">
      <PageHeader back={{ to: '/band', label: t('band.title') }} title={t('instruments.title')} />
      {errorMessage === null ? null : (
        <p className="text-danger text-meta mb-3" role="alert">
          {errorMessage}
        </p>
      )}
      {list.isLoading ? (
        <p className="text-ink-soft italic text-meta m-0">{t('common.loading')}</p>
      ) : null}
      <InstrumentsList
        rows={rows}
        listLabel={t('instruments.title')}
        dragHandleLabel={t('instruments.dragHandle')}
        deleteLabel={t('common.delete')}
        onSelect={editInstrument}
        onDelete={setPendingDeletionId}
        onReorder={(orderedInstrumentIds) =>
          reorder.mutate({ instrumentIds: [...orderedInstrumentIds] })
        }
      />
      {edited === null ? null : (
        <InstrumentFormSheet
          key={edited.instrumentId ?? 'new'}
          isNew={edited.instrumentId === null}
          initialValues={edited.values}
          onSave={saveInstrument}
          onClose={() => setEdited(null)}
        />
      )}
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
      <BottomActions>
        <Button variant="primary" size="lg" icon="plus" onClick={() => setEdited(NEW_INSTRUMENT)}>
          {t('instruments.add')}
        </Button>
      </BottomActions>
    </section>
  );
}
