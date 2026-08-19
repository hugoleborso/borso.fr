/**
 * The three note fields of the song form: how the song is built, the gimmicks
 * to watch for, and anything else.
 *
 * Three labelled boxes rather than one free-text area, because a named box
 * gets filled in and a blank one does not, and because the stage view reads
 * the structure and the gimmicks on their own.
 * @Feature songs
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';

const NOTE_MAX_LENGTH = 4_096;
const LABEL_CLASS = 'text-xs tracking-wider uppercase text-ink-400 font-medium';

interface SongNotesFieldsProps {
  readonly structureNotes: string;
  readonly gimmickNotes: string;
  readonly notes: string;
  readonly onStructureChange: (value: string) => void;
  readonly onGimmickChange: (value: string) => void;
  readonly onNotesChange: (value: string) => void;
}

const STRUCTURE_ROWS = 2;
const GIMMICK_ROWS = 3;
const NOTES_ROWS = 2;

// @FollowsBlueprint molecule-presentational
export function SongNotesFields(props: SongNotesFieldsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2.5">
      <label className={LABEL_CLASS} htmlFor="song-structure-notes">
        {t('catalog.notesStructure')}
      </label>
      <AutoGrowTextarea
        id="song-structure-notes"
        value={props.structureNotes}
        onChange={(event) => props.onStructureChange(event.target.value)}
        rows={STRUCTURE_ROWS}
        maxLength={NOTE_MAX_LENGTH}
        placeholder={t('catalog.notesStructurePlaceholder')}
      />
      <label className={LABEL_CLASS} htmlFor="song-gimmick-notes">
        {t('catalog.notesGimmicks')}
      </label>
      <AutoGrowTextarea
        id="song-gimmick-notes"
        value={props.gimmickNotes}
        onChange={(event) => props.onGimmickChange(event.target.value)}
        rows={GIMMICK_ROWS}
        maxLength={NOTE_MAX_LENGTH}
        placeholder={t('catalog.notesGimmicksPlaceholder')}
      />
      <label className={LABEL_CLASS} htmlFor="song-free-notes">
        {t('catalog.notesFree')}
      </label>
      <AutoGrowTextarea
        id="song-free-notes"
        value={props.notes}
        onChange={(event) => props.onNotesChange(event.target.value)}
        rows={NOTES_ROWS}
        maxLength={NOTE_MAX_LENGTH}
        placeholder={t('catalog.notesFreePlaceholder')}
      />
    </div>
  );
}
