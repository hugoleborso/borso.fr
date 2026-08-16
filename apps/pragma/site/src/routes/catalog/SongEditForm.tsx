/**
 * The full edit form rendered by SongEditPage — owns the TanStack
 * Form instance and every subscription against it.
 *
 * Delete sits below a rule, apart from Save, and asks first: the two used to
 * be 8px apart on the same row, and the write has no undo.
 *
 * The list of external links renders under the field that adds them. It used
 * to sit above the card, roughly a screen away, so on a phone adding a link
 * looked like it had done nothing. Split out of
 * SongEditPage so the route file stays focused on data-fetch +
 * navigation, while the form file stays under the per-file line cap.
 * @Feature songs
 */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Icon } from '../../components/atoms/Icon';
import { Input } from '../../components/atoms/Input';
import { inputVariants } from '../../components/atoms/input.variants';
import { BackLink } from '../../components/molecules/BackLink';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SongSearch } from '../../components/organisms/SongSearch';
import { deriveTonality } from '@domain/tonality.core';
import { SongChartFields } from './SongChartFields';
import { SongChordPreview } from './SongChordPreview';
import { SongDeleteAction } from './SongDeleteAction';
import { SongExternalLinks } from './SongExternalLinks';
import { SongLinkAdder } from './SongLinkAdder';
import { SongMusicBrainzPanel } from './SongMusicBrainzPanel';
import { SongNotesFields } from './SongNotesFields';
import {
  applyExternalPickToDraft,
  detectProvider,
  SONG_STATUS_LABEL_KEY,
  type SongDraftState,
  songStatuses,
} from './song-draft.core';

const TITLE_MAX = 256;
const ARTIST_MAX = 256;

interface SongEditFormProps {
  readonly isNew: boolean;
  readonly songId: string | undefined;
  readonly defaultValues: SongDraftState;
  readonly onSubmit: (value: SongDraftState) => Promise<void>;
  readonly onDelete: () => void;
  readonly newLinkUrl: string;
  readonly setNewLinkUrl: (value: string) => void;
  readonly error: string | null;
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
  error,
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
    const derived = deriveTonality(text);
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

  const labelClass = 'text-xs tracking-wider uppercase text-ink-400 font-medium';

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
      <BackLink to="/catalog" label={t('catalog.backToCatalog')} />
      <form.Subscribe selector={(state) => [state.values.artist, state.values.title] as const}>
        {([artistValue, titleValue]) => (
          <PageHeader
            crumb={artistValue.length > 0 ? artistValue : t('catalog.crumb')}
            title={isNew ? t('catalog.newSong') : titleValue}
            actions={
              !isNew && songId !== undefined ? (
                <Link to={`/catalog/${songId}/scene`}>
                  <Button variant="accent" type="button">
                    <Icon name="play" size={14} />
                    {t('catalog.openScene')}
                  </Button>
                </Link>
              ) : null
            }
          />
        )}
      </form.Subscribe>

      {error === null ? null : (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      )}

      <form.Subscribe
        selector={(state) => [state.values.chartKind, state.values.chordproText] as const}
      >
        {([chartKindValue, chordproValue]) => (
          <SongChordPreview chartKind={chartKindValue} chordproText={chordproValue} />
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
          {isNew ? (
            <SongSearch
              onPick={(hit) => {
                form.reset(applyExternalPickToDraft(form.state.values, hit));
              }}
              className="mb-2"
            />
          ) : null}

          <form.Subscribe
            selector={(state) =>
              [
                state.values.album,
                state.values.durationSeconds,
                state.values.mbid,
                state.values.tags,
                state.values.isrcs,
              ] as const
            }
          >
            {([albumValue, durationValue, mbidValue, tagsValue, isrcsValue]) => (
              <SongMusicBrainzPanel
                album={albumValue}
                durationSeconds={durationValue}
                mbid={mbidValue}
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
                maxLength={TITLE_MAX}
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
                maxLength={ARTIST_MAX}
              />
            )}
          </form.Field>

          <label className={labelClass} htmlFor="song-status">
            {t('catalog.status')}
          </label>
          <form.Field name="status">
            {(field) => (
              <select
                id="song-status"
                value={field.state.value}
                onChange={(event) => {
                  const status = z.enum(songStatuses).safeParse(event.target.value);
                  if (status.success) field.handleChange(status.data);
                }}
                onBlur={field.handleBlur}
                className={inputVariants({ size: 'md' })}
              >
                {songStatuses.map((status) => (
                  <option key={status} value={status}>
                    {t(SONG_STATUS_LABEL_KEY[status])}
                  </option>
                ))}
              </select>
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

          <div className="flex gap-2 mt-3">
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" variant="accent" disabled={!canSubmit || isSubmitting}>
                  {t('common.save')}
                </Button>
              )}
            </form.Subscribe>
          </div>
          {isNew ? null : <SongDeleteAction onDelete={onDelete} />}
        </form>
      </Card>
    </section>
  );
}
