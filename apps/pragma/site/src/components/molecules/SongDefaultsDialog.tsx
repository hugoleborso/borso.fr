/** @Feature songs */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { openDismissibleDialogOnAttach } from '../../lib/modal-dialog.adapter';
import { SONG_STATUS_LABEL_KEY, songStatuses } from '../../routes/catalog/song-draft.core';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import { Input } from '../atoms/Input';
import { inputVariants } from '../atoms/input.variants';
import {
  BASE_ENERGY_MAX,
  BASE_ENERGY_MIN,
  type SongDefaults,
  type SongDefaultsPatch,
  songDefaultsFormSchema,
  songDefaultsFromFormValues,
  songDefaultsToFormValues,
  TONALITY_MAX,
} from './song-defaults.core';

export type { SongDefaults, SongDefaultsPatch };

export interface SongDefaultsDialogProps {
  readonly open: boolean;
  readonly songTitle: string;
  readonly defaults: SongDefaults;
  readonly onSave: (defaults: SongDefaults) => void;
  readonly onClose: () => void;
}

const LABEL_CLASS = 'flex flex-col gap-1 text-xs tracking-wider uppercase text-ink-400 font-medium';
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
    <dialog
      ref={openDismissibleDialogOnAttach}
      onClose={onClose}
      className="m-auto w-[calc(100vw-1.5rem)] sm:w-[30rem] max-w-[30rem] max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-line bg-bg-elev">
        <h2 className="font-display italic text-xl text-ink-900 m-0 [overflow-wrap:anywhere]">
          {t('songDefaults.title', { title: songTitle })}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={t('common.cancel')}
          className="min-w-11"
        >
          ×
        </Button>
      </div>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4">
          <p className="text-xs text-ink-500 m-0">{t('songDefaults.hint')}</p>
          <form.Field name="status">
            {(field) => (
              <label className={LABEL_CLASS}>
                {t('catalog.status')}
                <select
                  value={field.state.value}
                  onChange={(event) => {
                    const status = songDefaultsFormSchema.shape.status.safeParse(
                      event.target.value,
                    );
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
                    maxLength={TONALITY_MAX}
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
                    maxLength={TONALITY_MAX}
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
                  min={BASE_ENERGY_MIN}
                  max={BASE_ENERGY_MAX}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  className={FIELD_CLASS}
                />
              </label>
            )}
          </form.Field>
        </div>
        <div className="shrink-0 px-4 py-3 flex flex-wrap gap-2 justify-end border-t border-line bg-bg-elev">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <form.Subscribe selector={(state) => state.canSubmit}>
            {(canSubmit) => (
              <Button type="submit" variant="accent" disabled={!canSubmit}>
                {t('common.save')}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </dialog>
  );
}
