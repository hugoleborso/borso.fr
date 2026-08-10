import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initialsAvatar } from '../../lib/initials.utils';
import { selectLabel } from '../../lib/label.utils';
import { formatBibNumber } from '../../lib/formatters.utils';
import { useCreateRunner, useRunnerRoster } from '../../lib/queries/runners';
import type { RaceEditionDto } from '../../lib/race.types';
import { Button } from '../atoms/Button';
import { Card, CardBody } from '../atoms/Card';
import { ErrorText } from '../atoms/ErrorText';
import { FileInput } from '../atoms/FileInput';
import { InitialsAvatar } from '../atoms/InitialsAvatar';
import { Label } from '../atoms/Label';
import { Show } from '../atoms/Show';
import { CardHeader } from '../molecules/CardHeader';
import { FormField } from '../molecules/FormField';
import { type AdminErrorMessage, selectRunnerCreateError } from './admin-errors.core';
import {
  readBibNumber,
  RUNNER_FORM_DEFAULTS,
  runnerFormValuesSchema,
  slugifyRunnerName,
} from './runner-form.core';
import { useRunnerPhotoUpload } from './useRunnerPhotoUpload';

const BIB_DIGITS = 0;
const NAME_FIELD_ID = 'runner-name';
const BIB_FIELD_ID = 'runner-bib';
const PHOTO_FIELD_ID = 'runner-photo';
const ACCEPTED_PHOTO_TYPES = 'image/jpeg,image/png,image/webp';
const HINT_STYLE = { fontSize: 11 } as const;
const NAME_FIELD_STYLE = { flex: 1, minWidth: 180 } as const;
const BIB_FIELD_STYLE = { width: 80 } as const;
const ROW_STYLE = { gap: 'var(--d-3)', flexWrap: 'wrap' } as const;
const ACTION_STYLE = { alignSelf: 'flex-end' } as const;
const LIST_STYLE = { listStyle: 'none', padding: 0, margin: 0 } as const;

interface RunnerAdminPanelProps {
  readonly edition: RaceEditionDto;
}

/**
 * Registration of the field, plus the roster as it stands. A picked photo is
 * uploaded to S3 first and the returned object key travels with the runner,
 * so a failed upload never leaves a runner pointing at a missing image.
 */
// @FollowsBlueprint organism-form
export function RunnerAdminPanel({ edition }: RunnerAdminPanelProps) {
  const { t } = useTranslation();
  const roster = useRunnerRoster(edition.slug);
  const createRunner = useCreateRunner();
  const photoUpload = useRunnerPhotoUpload(edition.slug);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [failure, setFailure] = useState<AdminErrorMessage | null>(null);

  const form = useForm({
    defaultValues: RUNNER_FORM_DEFAULTS,
    validators: { onChange: runnerFormValuesSchema },
    onSubmit: async ({ value, formApi }) => {
      setFailure(null);
      const slug = slugifyRunnerName(value.displayName);
      try {
        const photoKey = await photoUpload.uploadPhoto(slug, photoFile);
        await createRunner.mutateAsync({
          editionSlug: edition.slug,
          slug,
          displayName: value.displayName.trim(),
          bib: readBibNumber(value.bib),
          photoKey,
        });
        setPhotoFile(null);
        formApi.reset();
      } catch (error: unknown) {
        setFailure(selectRunnerCreateError(error));
      }
    },
  });

  const runners = roster.data?.runners ?? [];
  const isSending = createRunner.isPending || photoUpload.isPending;

  return (
    <Card>
      <CardHeader
        title={t('admin.runners.title')}
        hint={<span className="muted mono">{runners.length}</span>}
      />
      <form
        className="card-body col"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="row" style={ROW_STYLE}>
          <form.Field name="displayName">
            {(field) => (
              <FormField
                id={NAME_FIELD_ID}
                label={t('admin.runners.name')}
                value={field.state.value}
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                required
                minimumLength={2}
                style={NAME_FIELD_STYLE}
              />
            )}
          </form.Field>
          <form.Field name="bib">
            {(field) => (
              <FormField
                id={BIB_FIELD_ID}
                label={t('admin.runners.bib')}
                type="number"
                value={field.state.value}
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                required
                minimum={1}
                maximum={9999}
                style={BIB_FIELD_STYLE}
              />
            )}
          </form.Field>
          <div className="field" style={NAME_FIELD_STYLE}>
            <Label htmlFor={PHOTO_FIELD_ID}>{t('admin.runners.photo')}</Label>
            <FileInput
              id={PHOTO_FIELD_ID}
              accept={ACCEPTED_PHOTO_TYPES}
              capture="user"
              onFileChange={setPhotoFile}
            />
          </div>
          <div className="field" style={ACTION_STYLE}>
            <Button type="submit" variant="primary" size="small" disabled={isSending}>
              {t(selectLabel(isSending, 'admin.runners.sending', 'admin.runners.add'))}
            </Button>
          </div>
        </div>
        <div className="muted mono" style={HINT_STYLE}>
          {t('admin.runners.photo-hint')}
        </div>
        <Show when={failure !== null}>
          <ErrorText>{t(failure?.key ?? 'common.error-detail', failure?.parameters)}</ErrorText>
        </Show>
      </form>
      <CardBody modifier="flush">
        <Show when={runners.length === 0}>
          <div className="card-body muted">{t('admin.runners.empty')}</div>
        </Show>
        <ul style={LIST_STYLE}>
          {runners.map((runner) => {
            const avatar = initialsAvatar(runner.displayName);
            return (
              <li key={runner.slug} className="leaderboard-row">
                <span className="rank mono">#{formatBibNumber(runner.bib, BIB_DIGITS)}</span>
                <div className="row">
                  <InitialsAvatar
                    initials={avatar.initials}
                    backgroundColor={avatar.backgroundColor}
                  />
                  <span className="runner-name">{runner.displayName}</span>
                </div>
                <span className="loop-info">{runner.slug}</span>
                <span className="muted mono" />
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
