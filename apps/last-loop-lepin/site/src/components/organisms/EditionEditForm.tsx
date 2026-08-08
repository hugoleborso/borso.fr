import { useForm, useStore } from '@tanstack/react-form';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatElevationMetres, formatKilometres } from '../../lib/formatters.utils';
import { selectLabel } from '../../lib/label.utils';
import { listWhen } from '../../lib/optional.utils';
import {
  useDeleteEdition,
  useReplaceEdition,
  useTransitionEditionStatus,
} from '../../lib/queries/editions';
import type { RaceEditionDto } from '../../lib/race.types';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { ErrorText } from '../atoms/ErrorText';
import { Show } from '../atoms/Show';
import { CardHeader } from '../molecules/CardHeader';
import {
  type AdminErrorMessage,
  selectEditionDeleteError,
  selectEditionWriteError,
} from './admin-errors.core';
import {
  buildEditFormDefaults,
  buildReplaceEditionPayload,
  editionFormValuesSchema,
} from './edition-form.core';
import { EditionFormFields } from './EditionFormFields';
import { useGpxFile } from './useGpxFile';

const ID_PREFIX = 'setup';
const ACTIONS_STYLE = { gap: 'var(--d-2)', flexWrap: 'wrap' } as const;
const NOTE_STYLE = { fontSize: 11 } as const;

interface EditionEditFormProps {
  readonly edition: RaceEditionDto;
}

/**
 * Edit form for an edition still in setup. The slug is the primary key, so it
 * is read only here; leaving the GPX picker empty keeps the persisted track.
 */
export function EditionEditForm({ edition }: EditionEditFormProps) {
  const { t } = useTranslation();
  const gpx = useGpxFile();
  const [failure, setFailure] = useState<AdminErrorMessage | null>(null);
  const replaceEdition = useReplaceEdition();
  const deleteEdition = useDeleteEdition();
  const transition = useTransitionEditionStatus();

  const form = useForm({
    defaultValues: buildEditFormDefaults(edition),
    validators: { onChange: editionFormValuesSchema },
    onSubmit: async ({ value }) => {
      setFailure(null);
      const read = await gpx.readOptional();
      gpx.reportError(read.errorKey);
      for (const xml of listWhen(read.errorKey === null, read.xml)) {
        await replaceEdition
          .mutateAsync(buildReplaceEditionPayload(edition.slug, value, xml))
          .catch((error: unknown) => {
            setFailure(selectEditionWriteError(error));
          });
      }
    },
  });
  const values = useStore(form.store, (state) => state.values);

  function startRace(): void {
    const isConfirmed = globalThis.confirm(t('admin.setup.confirm-live'));
    setFailure(null);
    for (const slug of listWhen(isConfirmed, edition.slug)) {
      transition.mutate(
        { slug, status: 'live' },
        {
          onError: (error: unknown) => {
            setFailure(selectEditionWriteError(error));
          },
        },
      );
    }
  }

  function removeEdition(): void {
    const isConfirmed = globalThis.confirm(
      t('admin.setup.delete-confirm', { name: edition.displayName }),
    );
    setFailure(null);
    for (const slug of listWhen(isConfirmed, edition.slug)) {
      deleteEdition.mutate(
        { slug },
        {
          onError: (error: unknown) => {
            setFailure(selectEditionDeleteError(error));
          },
        },
      );
    }
  }

  const isBusy = replaceEdition.isPending || deleteEdition.isPending || transition.isPending;

  return (
    <Card>
      <CardHeader
        title={t('admin.setup.edit-title')}
        hint={<span className="muted mono">{t('admin.setup.hint-editing')}</span>}
      />
      <form
        className="card-body col"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <EditionFormFields
          idPrefix={ID_PREFIX}
          slug={{
            value: values.slug,
            onValueChange: (next) => {
              form.setFieldValue('slug', next);
            },
            onBlur: () => {
              void form.validateField('slug', 'blur');
            },
          }}
          displayName={{
            value: values.displayName,
            onValueChange: (next) => {
              form.setFieldValue('displayName', next);
            },
            onBlur: () => {
              void form.validateField('displayName', 'blur');
            },
          }}
          startsAt={{
            value: values.startsAt,
            onValueChange: (next) => {
              form.setFieldValue('startsAt', next);
            },
            onBlur: () => {
              void form.validateField('startsAt', 'blur');
            },
          }}
          endsAt={{
            value: values.endsAt,
            onValueChange: (next) => {
              form.setFieldValue('endsAt', next);
            },
            onBlur: () => {
              void form.validateField('endsAt', 'blur');
            },
          }}
          intervalMinutes={{
            value: values.intervalMinutes,
            onValueChange: (next) => {
              form.setFieldValue('intervalMinutes', next);
            },
            onBlur: () => {
              void form.validateField('intervalMinutes', 'blur');
            },
          }}
          isSlugLocked
          gpxLabel={t('admin.setup.gpx-replacement')}
          gpxFile={gpx.file}
          onGpxFileChange={gpx.pickFile}
          isGpxRequired={false}
          gpxErrorKey={gpx.errorKey}
          gpxNote={
            <div className="muted mono" style={NOTE_STYLE}>
              {t('admin.setup.gpx-current', {
                distance: t('common.distance', {
                  kilometres: formatKilometres(edition.gpx.distanceMeters),
                }),
                elevation: t('common.elevation-gain', {
                  metres: formatElevationMetres(edition.gpx.elevationGainMeters),
                }),
              })}
            </div>
          }
        />
        <Show when={failure !== null}>
          <ErrorText>{t(failure?.key ?? 'common.error-detail', failure?.parameters)}</ErrorText>
        </Show>
        <div className="row" style={ACTIONS_STYLE}>
          <Button type="submit" variant="primary" disabled={isBusy}>
            {t(
              selectLabel(
                replaceEdition.isPending,
                'admin.setup.updating',
                'admin.setup.update-action',
              ),
            )}
          </Button>
          <Button
            variant="primary"
            onClick={startRace}
            disabled={isBusy}
            title={t('admin.setup.start-race-hint')}
          >
            {t(selectLabel(transition.isPending, 'admin.setup.starting', 'admin.setup.start-race'))}
          </Button>
          <Button variant="danger" onClick={removeEdition} disabled={isBusy}>
            {t(selectLabel(deleteEdition.isPending, 'admin.setup.deleting', 'admin.setup.delete'))}
          </Button>
        </div>
      </form>
    </Card>
  );
}
