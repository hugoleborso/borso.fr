import { ENERGY_MAX, ENERGY_MIN, SONG_TONALITY_MAX_LENGTH } from '@domain/input-limits.core';
/** @Feature songs */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { SONG_STATUS_LABEL_KEY, songStatuses } from '../../routes/catalog/song-draft.core';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import { Input } from '../atoms/Input';
import { inputVariants } from '../atoms/input.variants';
import {
  type SongDefaults,
  type SongDefaultsPatch,
  songDefaultsFormSchema,
  songDefaultsFromFormValues,
  songDefaultsToFormValues,
} from './song-defaults.core';
import { Sheet } from './Sheet';

export type { SongDefaults, SongDefaultsPatch };

export interface SongDefaultsDialogProps {
  readonly open: boolean;
  readonly songTitle: string;
  readonly defaults: SongDefaults;
  readonly onSave: (defaults: SongDefaults) => void;
  readonly onClose: () => void;
}

const LABEL_CLASS = 'flex flex-col gap-1 text-label tracking-wider uppercase text-ink-soft';
const FIELD_CLASS = composeClassName(inputVariants({ size: 'sm' }), 'font-mono');

// @FollowsBlueprint molecule-dialog-form
export function SongDefaultsDialog(props: SongDefaultsDialogProps): JSX.Element | null {
  if (!props.open) return null;
  return <SongDefaultsDialogContent {...props} />;
}

function SongDefaultsDialogContent({
  songTitle,
  defaults,
  onSave,
  onClose,
}: SongDefaultsDialogProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: songDefaultsToFormValues(defaults),
    validators: { onChange: songDefaultsFormSchema },
    onSubmit: ({ value }) => {
      onSave(songDefaultsFromFormValues(value));
      onClose();
    },
  });

  return (
    <Sheet
      title={t('songDefaults.title', { title: songTitle })}
      label={t('songDefaults.title', { title: songTitle })}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" variant="primary" icon="check" disabled={!canSubmit}>
              {t('common.save')}
            </Button>
          )}
        </form.Subscribe>
      }
    >
      <div className="flex flex-col gap-3">
        <form.Field name="status">
          {(field) => (
            <label className={LABEL_CLASS}>
              {t('catalog.status')}
              <select
                value={field.state.value}
                onChange={(event) => {
                  const status = songDefaultsFormSchema.shape.status.safeParse(event.target.value);
                  if (status.success) field.handleChange(status.data);
                }}
                onBlur={field.handleBlur}
                className={inputVariants({ size: 'sm' })}
              >
                {songStatuses.map((status) => (
                  <option key={status} value={status}>
                    {t(SONG_STATUS_LABEL_KEY[status])}
                  </option>
                ))}
              </select>
            </label>
          )}
        </form.Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <form.Field name="tonalityStart">
            {(field) => (
              <label className={LABEL_CLASS}>
                {t('catalog.tonalityStart')}
                <Input
                  type="text"
                  size="sm"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  maxLength={SONG_TONALITY_MAX_LENGTH}
                  className={FIELD_CLASS}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="tonalityEnd">
            {(field) => (
              <label className={LABEL_CLASS}>
                {t('catalog.tonalityEnd')}
                <Input
                  type="text"
                  size="sm"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  maxLength={SONG_TONALITY_MAX_LENGTH}
                  className={FIELD_CLASS}
                />
              </label>
            )}
          </form.Field>
        </div>
        <form.Field name="baseEnergy">
          {(field) => (
            <label className={LABEL_CLASS}>
              {t('catalog.baseEnergy')}
              <Input
                type="number"
                size="sm"
                min={ENERGY_MIN}
                max={ENERGY_MAX}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                className={FIELD_CLASS}
              />
            </label>
          )}
        </form.Field>
      </div>
    </Sheet>
  );
}
