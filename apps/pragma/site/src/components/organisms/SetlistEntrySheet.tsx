/** @Feature setlists */

import type { Lineup } from '@domain/lineup.core';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SetlistEntryPatch } from '../../lib/queries/setlist-entries.queries';
import { reportEntryNoteSaveFailed } from '../../observability/error-reporting.adapter';
import { recordProductEvent } from '../../observability/product-event.adapter';
import { AlbumCover } from '../atoms/AlbumCover';
import { Button } from '../atoms/Button';
import { ButtonLink } from '../atoms/ButtonLink';
import { InlineLineupEditor, type InlineLineupInstrument } from '../molecules/InlineLineupEditor';
import { useLatestTextSave } from '../molecules/latest-text-save.hook';
import { selectTextSaveDisplay } from '../molecules/latest-text-save.utils';
import {
  formValuesToLineup,
  selectLineupSaveTarget,
  toLineupPayload,
} from '../molecules/lineup-editor.core';
import { SetlistEntryEnergyField } from '../molecules/SetlistEntryEnergyField';
import { SetlistEntryKeyCapoFields } from '../molecules/SetlistEntryKeyCapoFields';
import { SetlistEntryNotesField } from '../molecules/SetlistEntryNotesField';
import { useSetlistEntryForm } from '../molecules/setlist-entry-form.hook';
import { Sheet } from '../molecules/Sheet';
import { formatDuration } from '../molecules/song-duration.utils';
import { TextSaveStatus } from '../molecules/TextSaveStatus';
import {
  describeEntryLineup,
  type EntryLineupMember,
  toggleTonightInstrument,
} from './entry-lineup-change.core';

export type EntrySheetFocus = 'note' | 'lineup';

export interface EntrySheetEntry {
  readonly id: string;
  readonly songId: string;
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly energy: number | null;
  readonly notes: string;
  readonly lineupOverride: Lineup | null;
}

export interface EntrySheetSong {
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
  readonly durationSeconds: number | null;
  readonly baseEnergy: number | null;
  readonly defaultLineup: Lineup;
}

export interface EntrySheetInstrument extends InlineLineupInstrument {
  readonly position: number;
}

export interface SetlistEntrySheetProps {
  readonly setlistId: string;
  readonly entry: EntrySheetEntry;
  readonly song: EntrySheetSong;
  readonly position: number;
  readonly songCount: number;
  readonly members: readonly EntryLineupMember[];
  readonly instruments: readonly EntrySheetInstrument[];
  readonly focus: EntrySheetFocus;
  readonly onSave: (entryId: string, patch: SetlistEntryPatch) => Promise<unknown>;
  readonly onUpdate: (entryId: string, patch: SetlistEntryPatch) => void;
  readonly onSaveSongLineup: (lineup: Record<string, string[]>) => void;
  readonly onRecordTake: () => void;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-form
export function SetlistEntrySheet(props: SetlistEntrySheetProps): JSX.Element {
  const { t } = useTranslation();
  const { entry, song } = props;
  const [hasTypedNote, setHasTypedNote] = useState(false);
  const form = useSetlistEntryForm({
    keyOverride: entry.keyOverride ?? '',
    capo: entry.capo === null ? '' : String(entry.capo),
    notes: entry.notes,
  });
  const notesSave = useLatestTextSave({
    savedText: entry.notes,
    save: (text) =>
      props.onSave(entry.id, { notes: text }).catch((error: unknown) => {
        reportEntryNoteSaveFailed(props.setlistId);
        throw error;
      }),
    onSaved: ({ isSuperseded }) => {
      recordProductEvent('entry_note_saved');
      if (isSuperseded) recordProductEvent('entry_note_save_superseded');
    },
  });
  const keySave = useLatestTextSave({
    savedText: entry.keyOverride ?? '',
    save: (text) => props.onSave(entry.id, { keyOverride: text.length === 0 ? null : text }),
  });
  const capoSave = useLatestTextSave({
    savedText: entry.capo === null ? '' : String(entry.capo),
    save: (text) => props.onSave(entry.id, { capo: text === '' ? null : Number(text) }),
  });
  const lineupRows = describeEntryLineup({
    songDefaultLineup: song.defaultLineup,
    lineupOverride: entry.lineupOverride,
    members: props.members,
    instruments: props.instruments,
  });

  const flushSaves = (): void => {
    notesSave.flush();
    keySave.flush();
    capoSave.flush();
  };
  const close = (): void => {
    flushSaves();
    props.onClose();
  };
  const recordTake = (): void => {
    flushSaves();
    props.onRecordTake();
  };
  const toggleInstrument = (memberId: string, instrumentId: string): void => {
    const edited = formValuesToLineup(toggleTonightInstrument(lineupRows, memberId, instrumentId));
    const saveTo = {
      'song-default': () => props.onSaveSongLineup(toLineupPayload(edited)),
      'entry-override': () => props.onUpdate(entry.id, { lineupOverride: toLineupPayload(edited) }),
      'entry-cleared': () => props.onUpdate(entry.id, { lineupOverride: null }),
    } as const;
    saveTo[selectLineupSaveTarget(song.defaultLineup, edited, false)]();
  };
  const lengthLabel = song.durationSeconds === null ? null : formatDuration(song.durationSeconds);

  return (
    <Sheet
      title={
        <span className="flex items-center gap-3">
          <AlbumCover title={song.title} deezerAlbumId={song.deezerAlbumId} size="sheet" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate">{song.title}</span>
            <span className="truncate font-sans text-meta text-ink-soft">
              {lengthLabel === null ? song.artist : `${song.artist} · ${lengthLabel}`}
            </span>
            <span className="font-sans text-label text-ink-soft">
              {t('setlist.entryPosition', { position: props.position, count: props.songCount })}
            </span>
          </span>
        </span>
      }
      label={song.title}
      isTitleARecordName
      subheader={
        <SetlistEntryKeyCapoFields
          form={form}
          onKeyType={keySave.type}
          onCapoType={capoSave.type}
        />
      }
      onClose={close}
      footer={
        <>
          <ButtonLink variant="secondary" icon="song" to={`/catalog/${entry.songId}`}>
            {t('setlist.openSong')}
          </ButtonLink>
          <Button variant="primary" icon="mic" onClick={recordTake}>
            {t('setlist.recordTake')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <InlineLineupEditor
          rows={lineupRows}
          instruments={props.instruments}
          isOverridingSong={lineupRows.some((row) => row.isChangedTonight)}
          isFocusedOnOpen={props.focus === 'lineup'}
          onToggle={toggleInstrument}
          onUseSongLineup={() => props.onUpdate(entry.id, { lineupOverride: null })}
        />
        <div className="flex min-h-11 items-center gap-3">
          <span className="text-meta text-ink-soft">{t('setlist.energy')}</span>
          <SetlistEntryEnergyField
            entryEnergy={entry.energy}
            songEnergy={song.baseEnergy}
            onPublish={(level) => props.onUpdate(entry.id, { energy: level })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <SetlistEntryNotesField
            form={form}
            isFocusedOnOpen={props.focus === 'note'}
            onType={(text) => {
              setHasTypedNote(true);
              notesSave.type(text);
            }}
          />
          <TextSaveStatus
            display={selectTextSaveDisplay(notesSave.status, hasTypedNote)}
            onRetry={notesSave.flush}
          />
        </div>
      </div>
    </Sheet>
  );
}
