/** @Feature songs */

import { SONG_TEXT_FIELD_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../atoms/Input';
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
import type { LineupEditorMember } from '../molecules/lineup-editor.core';
import type { LineupMemberRowInstrument } from '../molecules/LineupMemberRow';
import { FIELD_LABEL_CLASS, LabelledField } from '../atoms/LabelledField';
import { SongKeyEnergyFields } from '../molecules/SongKeyEnergyFields';
import { SongLineupFields } from '../molecules/SongLineupFields';
import {
  applyExternalIdentityToDraft,
  applyExternalPickToDraft,
  detectProvider,
  type SongDraftState,
} from '../../routes/catalog/song-draft.core';
import {
  type SongEditSection,
  toggleLineupInstrument,
} from '../../routes/catalog/song-edit-page.core';
import { SongEditHeader } from './SongEditHeader';
import type { SongSaveRefusal } from '../../lib/queries/song-save-refusal.core';

interface SongEditFormProps {
  readonly isNew: boolean;
  readonly songId: string | undefined;
  readonly defaultValues: SongDraftState;
  readonly section: SongEditSection;
  readonly members: readonly LineupEditorMember[];
  readonly instruments: readonly LineupMemberRowInstrument[];
  readonly onSectionChange: (section: SongEditSection) => void;
  readonly onSubmit: (value: SongDraftState) => Promise<void>;
  readonly onDelete: () => void;
  readonly newLinkUrl: string;
  readonly setNewLinkUrl: (value: string) => void;
  readonly refusal: SongSaveRefusal;
}

const SONG_EDIT_FORM_ID = 'song-edit-form';
// @FollowsBlueprint route-form
export function SongEditForm({
  isNew,
  songId,
  defaultValues,
  section,
  members,
  instruments,
  onSectionChange,
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
  const isExistingSong = !isNew && songId !== undefined;

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
    const added = { url: trimmed, provider: detectProvider(trimmed), comment: '' };
    form.setFieldValue('links', [...form.getFieldValue('links'), added]);
    setNewLinkUrl('');
  };

  const removeLink = (index: number): void => {
    const kept = form.getFieldValue('links').filter((_, current) => current !== index);
    form.setFieldValue('links', kept);
  };

  const identityPanel = (
    <>
      <SongSearch
        onPick={(hit) => {
          form.reset(
            isNew
              ? applyExternalPickToDraft(form.state.values, hit)
              : applyExternalIdentityToDraft(form.state.values, hit),
          );
        }}
      />
      <form.Field name="title">
        {(field) => (
          <LabelledField id="song-title" label={t('catalog.songTitle')}>
            <Input
              id="song-title"
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
              maxLength={SONG_TEXT_FIELD_MAX_LENGTH}
            />
          </LabelledField>
        )}
      </form.Field>
      <form.Field name="artist">
        {(field) => (
          <LabelledField id="song-artist" label={t('catalog.artist')}>
            <Input
              id="song-artist"
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              maxLength={SONG_TEXT_FIELD_MAX_LENGTH}
            />
          </LabelledField>
        )}
      </form.Field>
      <form.Field name="status">
        {(statusField) => (
          <form.Field name="origin">
            {(originField) => (
              <SongClassificationFields
                labelClassName={FIELD_LABEL_CLASS}
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
      <SongLinkAdder newLinkUrl={newLinkUrl} setNewLinkUrl={setNewLinkUrl} onAdd={addLink}>
        <form.Field name="links">
          {(field) => <SongExternalLinks links={field.state.value} onRemove={removeLink} />}
        </form.Field>
      </SongLinkAdder>
      {isExistingSong ? <SongDeleteAction onDelete={onDelete} /> : null}
    </>
  );

  const musicPanel = (
    <>
      <form.Subscribe
        selector={(state) =>
          [state.values.tonalityStart, state.values.tonalityEnd, state.values.baseEnergy] as const
        }
      >
        {([tonalityStart, tonalityEnd, baseEnergy]) => (
          <SongKeyEnergyFields
            tonalityStart={tonalityStart}
            tonalityEnd={tonalityEnd}
            baseEnergy={baseEnergy}
            onTonalityStartChange={(value) => form.setFieldValue('tonalityStart', value)}
            onTonalityEndChange={(value) => form.setFieldValue('tonalityEnd', value)}
            onBaseEnergyChange={(value) => form.setFieldValue('baseEnergy', value)}
          />
        )}
      </form.Subscribe>
      <form.Subscribe
        selector={(state) =>
          [
            state.values.chartKind,
            state.values.chordproText,
            state.values.pdfS3Key,
            state.values.imageS3Key,
          ] as const
        }
      >
        {([chartKind, chordproText, pdfS3Key, imageS3Key]) => (
          <SongChartFields
            chartKind={chartKind}
            chordproText={chordproText}
            pdfS3Key={pdfS3Key}
            imageS3Key={imageS3Key}
            {...(isExistingSong ? { songId } : {})}
            onChartKindChange={(kind) => form.setFieldValue('chartKind', kind)}
            onChordproChange={applyChordproText}
            onPdfKeyChange={(value) => form.setFieldValue('pdfS3Key', value)}
            onImageKeyChange={(value) => form.setFieldValue('imageS3Key', value)}
          />
        )}
      </form.Subscribe>
    </>
  );

  const notesPanel = (
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
  );

  const lineupPanel = (
    <form.Field name="defaultLineup">
      {(field) => (
        <SongLineupFields
          members={members}
          instruments={instruments}
          lineup={field.state.value}
          onToggle={(memberId, instrumentId) =>
            field.handleChange(toggleLineupInstrument(field.state.value, memberId, instrumentId))
          }
        />
      )}
    </form.Field>
  );

  const panelBySection: Readonly<Record<SongEditSection, JSX.Element>> = {
    identity: identityPanel,
    music: musicPanel,
    notes: notesPanel,
    lineup: lineupPanel,
  };

  return (
    <section className="flex max-w-3xl flex-col px-4 py-4 sm:px-9 sm:py-7">
      <form.Subscribe
        selector={(state) =>
          [state.values.artist, state.values.title, state.canSubmit, state.isSubmitting] as const
        }
      >
        {([artistValue, titleValue, canSubmit, isSubmitting]) => (
          <SongEditHeader
            back={
              isExistingSong
                ? { to: `/catalog/${songId}`, label: titleValue }
                : { to: '/catalog', label: t('catalog.backToCatalog') }
            }
            crumb={artistValue.length > 0 ? artistValue : t('catalog.crumb')}
            title={isNew ? t('catalog.newSong') : titleValue}
            formId={SONG_EDIT_FORM_ID}
            isSaveDisabled={!canSubmit || isSubmitting}
            section={section}
            onSectionChange={onSectionChange}
            refusal={refusal}
          />
        )}
      </form.Subscribe>

      <form
        id={SONG_EDIT_FORM_ID}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-4 pt-4 pb-8"
      >
        {panelBySection[section]}
      </form>
    </section>
  );
}
