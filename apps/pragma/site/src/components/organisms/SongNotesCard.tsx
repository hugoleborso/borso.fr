/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { selectSongNoteSections } from '../../routes/catalog/song-notes.core';
import { ButtonLink } from '../atoms/ButtonLink';
import { Card } from '../atoms/Card';
import { SongNotes } from '../molecules/SongNotes';

export interface SongNotesCardProps {
  readonly song: {
    readonly id: string;
    readonly structureNotes: string;
    readonly gimmickNotes: string;
    readonly notes: string;
  };
}

// @FollowsBlueprint organism-presentational
export function SongNotesCard({ song }: SongNotesCardProps): JSX.Element {
  const { t } = useTranslation();
  const hasNotes = selectSongNoteSections(song).length > 0;
  return (
    <Card className="flex flex-col gap-2.5">
      <h2 className="m-0 text-label tracking-wider uppercase text-ink-soft font-medium">
        {t('catalog.commentsTitle')}
      </h2>
      {hasNotes ? (
        <SongNotes song={song} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-meta text-ink-soft italic">{t('catalog.noSongNotes')}</p>
          <ButtonLink
            to={`/catalog/${song.id}/edit?section=notes`}
            variant="quiet"
            size="sm"
            icon="edit"
          >
            {t('common.edit')}
          </ButtonLink>
        </div>
      )}
    </Card>
  );
}
