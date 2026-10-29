/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { type SongNoteInput, selectSongNoteSections } from '../../routes/catalog/song-notes.core';
import { ButtonLink } from '../atoms/ButtonLink';
import { EmptyState } from '../molecules/EmptyState';
import { Sheet } from '../molecules/Sheet';
import { SongNotes } from '../molecules/SongNotes';

export interface SongNotesSheetProps {
  readonly songId: string;
  readonly notes: SongNoteInput;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-presentational
export function SongNotesSheet({ songId, notes, onClose }: SongNotesSheetProps): JSX.Element {
  const { t } = useTranslation();
  const hasNotes = selectSongNoteSections(notes).length > 0;
  return (
    <Sheet title={t('catalog.notesTitle')} label={t('catalog.notesTitle')} onClose={onClose}>
      {hasNotes ? (
        <SongNotes song={notes} />
      ) : (
        <EmptyState
          icon="text"
          action={
            <ButtonLink to={`/catalog/${songId}/edit`} variant="secondary" size="sm" icon="edit">
              {t('common.edit')}
            </ButtonLink>
          }
        >
          {t('catalog.noSongNotes')}
        </EmptyState>
      )}
    </Sheet>
  );
}
