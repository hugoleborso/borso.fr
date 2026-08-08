import { useForm, useStore } from '@tanstack/react-form';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectLabel } from '../../lib/label.utils';
import { listPresent } from '../../lib/optional.utils';
import { useCreateEdition } from '../../lib/queries/editions';
import type { RaceEditionDto } from '../../lib/race.types';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { ErrorText } from '../atoms/ErrorText';
import { Show } from '../atoms/Show';
import { CardHeader } from '../molecules/CardHeader';
import { type AdminErrorMessage, selectEditionWriteError } from './admin-errors.core';
import {
  buildCreateEditionPayload,
  buildCreateFormDefaults,
  editionFormValuesSchema,
} from './edition-form.core';
import { EditionFormFields } from './EditionFormFields';
import { useGpxFile } from './useGpxFile';

const ID_PREFIX = 'create';
const ACTIONS_STYLE = { gap: 'var(--d-2)', flexWrap: 'wrap' } as const;

interface CreateEditionFormProps {
  readonly currentEdition: RaceEditionDto | null;
  readonly titleKey: 'admin.setup.create-title' | 'admin.setup.create-another-title';
  readonly hintKey: 'admin.setup.hint-initial' | 'admin.setup.hint-different-slug';
  readonly now: Date;
}

/**
 * Standalone create form, always available so the organiser can register next
 * year's race while the current one is still running. It owns its own field
 * state, so editing the live edition next to it cannot leak values across.
 */
export function CreateEditionForm({
  currentEdition,
  titleKey,
  hintKey,
  now,
}: CreateEditionFormProps) {
  const { t } = useTranslation();
  const gpx = useGpxFile();
  const [failure, setFailure] = useState<AdminErrorMessage | null>(null);
  const createEdition = useCreateEdition();

  const form = useForm({
    defaultValues: buildCreateFormDefaults(currentEdition, now),
    validators: { onChange: editionFormValuesSchema },
    onSubmit: async ({ value, formApi }) => {
      setFailure(null);
      const read = await gpx.readRequired();
      gpx.reportError(read.errorKey);
      for (const xml of listPresent(read.xml)) {
        await createEdition
          .mutateAsync(buildCreateEditionPayload(value, xml))
          .then(() => {
            gpx.pickFile(null);
            formApi.reset();
          })
          .catch((error: unknown) => {
            setFailure(selectEditionWriteError(error));
          });
      }
    },
  });
  const values = useStore(form.store, (state) => state.values);

  return (
    <Card>
      <CardHeader title={t(titleKey)} hint={<span className="muted mono">{t(hintKey)}</span>} />
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
          isSlugLocked={false}
          gpxLabel={t('admin.setup.gpx')}
          gpxFile={gpx.file}
          onGpxFileChange={gpx.pickFile}
          isGpxRequired
          gpxErrorKey={gpx.errorKey}
        />
        <Show when={failure !== null}>
          <ErrorText>{t(failure?.key ?? 'common.error-detail', failure?.parameters)}</ErrorText>
        </Show>
        <div className="row" style={ACTIONS_STYLE}>
          <Button type="submit" variant="primary" disabled={createEdition.isPending}>
            {t(
              selectLabel(
                createEdition.isPending,
                'admin.setup.creating',
                'admin.setup.create-action',
              ),
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
