/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongRecord } from '../../lib/queries/songs.queries';
import { useSongLongPress } from '../../lib/song-long-press.hook';
import { buildTonalityLabel } from '../../routes/catalog/tonality-label.utils';
import { AlbumCover } from '../atoms/AlbumCover';
import { ButtonLink } from '../atoms/ButtonLink';
import { Menu, type MenuItem } from '../molecules/Menu';
import { StatusChip } from '../molecules/StatusChip';

export interface SongDetailHeaderProps {
  readonly song: SongRecord;
  readonly menuItems: readonly MenuItem[];
}

// @FollowsBlueprint organism-presentational
export function SongDetailHeader({ song, menuItems }: SongDetailHeaderProps): JSX.Element {
  const { t } = useTranslation();
  const longPress = useSongLongPress({
    title: song.title,
    artist: song.artist,
    deezerTrackId: song.deezerTrackId,
    spotifyTrackId: song.spotifyTrackId,
  });
  const tonality = buildTonalityLabel(song.tonalityStart, song.tonalityEnd);

  return (
    <header className="flex items-start gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-4 select-none" {...longPress}>
        <AlbumCover title={song.title} deezerAlbumId={song.deezerAlbumId} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="m-0 font-display text-display leading-tight text-ink">{song.title}</h1>
          {song.artist.length > 0 ? (
            <p className="m-0 text-body text-ink-soft">{song.artist}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-meta text-ink-soft">
            <StatusChip status={song.status} />
            {tonality === null ? null : <span className="font-mono">{tonality}</span>}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ButtonLink to={`/catalog/${song.id}/edit`} variant="secondary" size="sm" icon="edit">
          {t('common.edit')}
        </ButtonLink>
        <Menu label={t('catalog.songActions')} items={menuItems} />
      </div>
    </header>
  );
}
