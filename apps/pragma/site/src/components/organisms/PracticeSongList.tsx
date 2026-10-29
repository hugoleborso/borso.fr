/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { type SongCardSource, toSongCard } from '../../routes/catalog/catalog-page.core';
import { EmptyState } from '../molecules/EmptyState';
import type { SongStatus } from '../molecules/StatusChip';
import { CatalogList } from './CatalogList';

export interface PracticeListedSong extends SongCardSource<SongStatus> {
  readonly artist: string;
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
  return <CatalogList songs={songs.map((song) => toSongCard(song, song.artist))} />;
}
