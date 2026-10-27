/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { selectSongNoteSections } from '../../routes/catalog/song-notes.core';
import { Card } from '../atoms/Card';
import { SongNotes } from '../molecules/SongNotes';

export interface SongNotesCardProps {
  readonly song: {
    readonly structureNotes: string;
    readonly gimmickNotes: string;
    readonly notes: string;
  };
}

// @FollowsBlueprint organism-presentational
export function SongNotesCard({ song }: SongNotesCardProps): JSX.Element | null {
  const { t } = useTranslation();
  const sections = selectSongNoteSections(song);
  if (sections.length === 0) return null;
  return (
    <Card>
      <div className="text-xs tracking-wider uppercase text-ink-400 font-medium mb-2.5">
        {t('catalog.notesTitle')}
      </div>
      <SongNotes song={song} />
    </Card>
  );
}
