/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AlbumCover } from '../atoms/AlbumCover';
import { EmptyState } from '../molecules/EmptyState';

export interface PracticeListedSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
}

export interface PracticeSongListProps {
  readonly songs: readonly PracticeListedSong[];
  readonly isLoading: boolean;
}

// @FollowsBlueprint organism-presentational
export function PracticeSongList({ songs, isLoading }: PracticeSongListProps): JSX.Element {
  const { t } = useTranslation();
  if (isLoading) {
    return <p className="m-0 text-meta text-ink-soft italic">{t('common.loading')}</p>;
  }
  if (songs.length === 0) {
    return <EmptyState icon="song">{t('sessions.practiceSongs.empty')}</EmptyState>;
  }
  return (
    <ul aria-label={t('sessions.view.songs')} className="m-0 flex list-none flex-col p-0">
      {songs.map((song) => (
        <li key={song.id} className="flex min-h-14 items-center gap-3 border-b border-rule py-2">
          <AlbumCover title={song.title} deezerAlbumId={song.deezerAlbumId} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-title text-ink">{song.title}</span>
            <span className="block truncate text-meta text-ink-soft">{song.artist}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
