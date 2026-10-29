/** @Feature songs */

import { SONG_TEXT_FIELD_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { BottomActions } from '../atoms/BottomActions';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { PageHeader } from '../molecules/PageHeader';
import { SongSearch } from './SongSearch';
import { deriveTonality } from '@domain/tonality.core';
import { convertChordsAboveLyrics } from '../../routes/catalog/chords-above-lyrics.core';
import { SongChartFields } from './SongChartFields';
import { SongDeleteAction } from './SongDeleteAction';
import { SongExternalLinks } from './SongExternalLinks';
import { SongClassificationFields } from '../molecules/SongClassificationFields';
import { SongLinkAdder } from '../molecules/SongLinkAdder';
import { SongExternalMetadataPanel } from '../molecules/SongExternalMetadataPanel';
import { SongNotesFields } from '../molecules/SongNotesFields';
import { DeezerTrackTakenNotice } from '../molecules/DeezerTrackTakenNotice';
import {
  applyExternalIdentityToDraft,
  applyExternalPickToDraft,
  detectProvider,
  type SongDraftState,
} from '../../routes/catalog/song-draft.core';
import type { SongSaveRefusal } from '../../lib/queries/song-save-refusal.core';

interface SongEditFormProps {
  readonly isNew: boolean;
  readonly songId: string | undefined;
  readonly defaultValues: SongDraftState;
  readonly onSubmit: (value: SongDraftState) => Promise<void>;
  readonly onDelete: () => void;
  readonly newLinkUrl: string;
  readonly setNewLinkUrl: (value: string) => void;
  readonly refusal: SongSaveRefusal;
}

// @FollowsBlueprint route-form
export function SongEditForm({
  isNew,
  songId,
  defaultValues,
  onSubmit,
  onDelete,
  newLinkUrl,
  setNewLinkUrl,
  refusal,
}: SongEditFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  const applyChordproText = (text: string): void => {
    form.setFieldValue('chordproText', text);
    const derived = deriveTonality(convertChordsAboveLyrics(text).chordPro);
    const currentStart = form.getFieldValue('tonalityStart');
    const currentEnd = form.getFieldValue('tonalityEnd');
    if (currentStart.length === 0 && derived.start !== null) {
      form.setFieldValue('tonalityStart', derived.start);
    }
    if (currentEnd.length === 0 && derived.end !== null) {
      form.setFieldValue('tonalityEnd', derived.end);
    }
  };

  const addLink = (): void => {
    const trimmed = newLinkUrl.trim();
    if (trimmed.length === 0) return;
    const current = form.getFieldValue('links');
    form.setFieldValue('links', [
      ...current,
      { url: trimmed, provider: detectProvider(trimmed), comment: '' },
    ]);
    setNewLinkUrl('');
  };

  const removeLink = (index: number): void => {
    const current = form.getFieldValue('links');
    form.setFieldValue(
      'links',
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const labelClass = 'text-label tracking-wider uppercase text-ink-soft font-medium';

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
      <form.Subscribe selector={(state) => [state.values.artist, state.values.title] as const}>
        {([artistValue, titleValue]) => (
          <PageHeader
            back={
              isNew || songId === undefined
                ? { to: '/catalog', label: t('catalog.backToCatalog') }
                : { to: `/catalog/${songId}`, label: titleValue }
            }
            crumb={artistValue.length > 0 ? artistValue : t('catalog.crumb')}
            title={isNew ? t('catalog.newSong') : titleValue}
            className="mb-0 sm:mb-0"
          />
        )}
      </form.Subscribe>

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-2.5"
        >
          <SongSearch
            onPick={(hit) => {
              form.reset(
                isNew
                  ? applyExternalPickToDraft(form.state.values, hit)
                  : applyExternalIdentityToDraft(form.state.values, hit),
              );
            }}
            className="mb-2"
          />

          <form.Subscribe
            selector={(state) =>
              [
                state.values.album,
                state.values.durationSeconds,
                state.values.deezerTrackId,
                state.values.tags,
                state.values.isrcs,
              ] as const
            }
          >
            {([albumValue, durationValue, deezerTrackIdValue, tagsValue, isrcsValue]) => (
              <SongExternalMetadataPanel
                album={albumValue}
                durationSeconds={durationValue}
                deezerTrackId={deezerTrackIdValue}
                tags={tagsValue}
                isrcs={isrcsValue}
              />
            )}
          </form.Subscribe>

          <label className={labelClass} htmlFor="song-title">
            {t('catalog.songTitle')}
          </label>
          <form.Field name="title">
            {(field) => (
              <Input
                id="song-title"
                type="text"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                required
                maxLength={SONG_TEXT_FIELD_MAX_LENGTH}
              />
            )}
          </form.Field>

          <label className={labelClass} htmlFor="song-artist">
            {t('catalog.artist')}
          </label>
          <form.Field name="artist">
            {(field) => (
              <Input
                id="song-artist"
                type="text"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                maxLength={SONG_TEXT_FIELD_MAX_LENGTH}
              />
            )}
          </form.Field>

          <form.Field name="status">
            {(statusField) => (
              <form.Field name="origin">
                {(originField) => (
                  <SongClassificationFields
                    labelClassName={labelClass}
                    status={statusField.state.value}
                    origin={originField.state.value}
                    onStatusChange={statusField.handleChange}
                    onStatusBlur={statusField.handleBlur}
                    onOriginChange={originField.handleChange}
                    onOriginBlur={originField.handleBlur}
                  />
                )}
              </form.Field>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) =>
              [
                state.values.chartKind,
                state.values.chordproText,
                state.values.pdfS3Key,
                state.values.imageS3Key,
                state.values.tonalityStart,
                state.values.tonalityEnd,
                state.values.baseEnergy,
              ] as const
            }
          >
            {(chart) => (
              <SongChartFields
                chartKind={chart[0]}
                chordproText={chart[1]}
                pdfS3Key={chart[2]}
                imageS3Key={chart[3]}
                tonalityStart={chart[4]}
                tonalityEnd={chart[5]}
                baseEnergy={chart[6]}
                {...(songId !== undefined && !isNew ? { songId } : {})}
                onChartKindChange={(kind) => form.setFieldValue('chartKind', kind)}
                onChordproChange={applyChordproText}
                onPdfKeyChange={(value) => form.setFieldValue('pdfS3Key', value)}
                onImageKeyChange={(value) => form.setFieldValue('imageS3Key', value)}
                onTonalityStartChange={(value) => form.setFieldValue('tonalityStart', value)}
                onTonalityEndChange={(value) => form.setFieldValue('tonalityEnd', value)}
                onBaseEnergyChange={(value) => form.setFieldValue('baseEnergy', value)}
              />
            )}
          </form.Subscribe>

          <form.Subscribe
            selector={(state) =>
              [state.values.structureNotes, state.values.gimmickNotes, state.values.notes] as const
            }
          >
            {([structureValue, gimmickValue, notesValue]) => (
              <SongNotesFields
                structureNotes={structureValue}
                gimmickNotes={gimmickValue}
                notes={notesValue}
                onStructureChange={(value) => form.setFieldValue('structureNotes', value)}
                onGimmickChange={(value) => form.setFieldValue('gimmickNotes', value)}
                onNotesChange={(value) => form.setFieldValue('notes', value)}
              />
            )}
          </form.Subscribe>

          <SongLinkAdder newLinkUrl={newLinkUrl} setNewLinkUrl={setNewLinkUrl} onAdd={addLink}>
            <form.Field name="links">
              {(field) => <SongExternalLinks links={field.state.value} onRemove={removeLink} />}
            </form.Field>
          </SongLinkAdder>

          <BottomActions>
            <div className="flex flex-col items-start gap-2 w-full">
              {refusal.failureMessage === null ? null : (
                <p className="text-danger text-meta" role="alert">
                  {refusal.failureMessage}
                </p>
              )}
              {refusal.takenTrack === null ? null : (
                <DeezerTrackTakenNotice takenTrack={refusal.takenTrack} />
              )}
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button
                    icon="check"
                    type="submit"
                    variant="primary"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {t('common.save')}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </BottomActions>
          {isNew ? null : <SongDeleteAction onDelete={onDelete} />}
        </form>
      </Card>
    </section>
  );
}
