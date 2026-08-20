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
import { CardHeader } from '../atoms/CardHeader';
import { type AdminErrorMessage, selectEditionWriteError } from './admin-errors.core';
import {
  buildCreateEditionPayload,
  buildCreateFormDefaults,
  editionFormValuesSchema,
} from './edition-form.core';
import { EditionFormFields } from './EditionFormFields';
import { useGpxFile } from './useGpxFile';

const ID_PREFIX = 'create';

interface CreateEditionFormProps {
  readonly currentEdition: RaceEditionDto | null;
  readonly titleKey: 'admin.setup.create-title' | 'admin.setup.create-another-title';
  readonly hintKey: 'admin.setup.hint-initial' | 'admin.setup.hint-different-slug';
  readonly now: Date;
}

/**
 * @Blueprint organism-form
 * @BlueprintName Organism Form
 * @BlueprintUsage Use for a screen region that collects fields and writes them through a mutation.
 * @BlueprintDescription Holds one `useForm` whose `defaultValues`, `validators` and payload all come from `edition-form.core.ts`, so the schema, the starting values and the request body are pure and tested away from React. Field values are read with `useStore` rather than mirrored into `useState`, the submit handler calls `mutateAsync` directly instead of watching a flag in an effect, and a rejected write becomes a translation key through `selectEditionWriteError`.
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
      <CardHeader
        title={t(titleKey)}
        hint={<span className="font-mono tabular-nums text-ink-3">{t(hintKey)}</span>}
      />
      <form
        className="flex flex-col gap-3 flex-1 overflow-auto px-5 py-4"
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
        <div className="flex flex-wrap items-center gap-2">
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
