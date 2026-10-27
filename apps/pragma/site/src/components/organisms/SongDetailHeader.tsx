/** @Feature songs */

import { SONG_TONALITY_MAX_LENGTH } from '@domain/input-limits.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { SongRecord } from '../../lib/queries/songs.queries';
import { useSongLongPress } from '../../lib/song-long-press.hook';
import { extractChartKind } from '../../routes/catalog/chart-kind.utils';
import { buildTonalityLabel } from '../../routes/catalog/tonality-label.utils';
import { AlbumCover } from '../atoms/AlbumCover';
import { Button } from '../atoms/Button';
import { ChartKindIcon } from '../molecules/ChartKindIcon';
import { StatusChip } from '../molecules/StatusChip';

export interface SongDetailHeaderProps {
  readonly song: SongRecord;
}

// @FollowsBlueprint organism-presentational
export function SongDetailHeader({ song }: SongDetailHeaderProps): JSX.Element {
  const { t } = useTranslation();
  const longPress = useSongLongPress({
    title: song.title,
    artist: song.artist,
    deezerTrackId: song.deezerTrackId,
    spotifyTrackId: song.spotifyTrackId,
  });
  const chartKind = extractChartKind(song.chart);
  const tonality = buildTonalityLabel(song.tonalityStart, song.tonalityEnd);

  return (
    <header className="flex items-end justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-4 min-w-0 select-none" {...longPress}>
        <AlbumCover title={song.title} deezerAlbumId={song.deezerAlbumId} size="lg" />
        <div className="min-w-0">
          <div className="text-label tracking-wider uppercase text-ink-soft mb-1">
            {song.artist.length > 0 ? song.artist : t('catalog.crumb')}
          </div>
          <h1 className="font-display text-display sm:text-display leading-[0.95] tracking-[-0.015em] text-ink m-0 mb-2">
            {song.title}
          </h1>
          <div className="flex items-center gap-2.5 text-meta text-ink-soft flex-wrap">
            <span>{song.artist}</span>
            {tonality === null ? null : (
              <>
                <span className="text-ink-faint">·</span>
                <span className="font-mono text-meta">
                  {tonality.slice(0, SONG_TONALITY_MAX_LENGTH)}
                </span>
              </>
            )}
            <span className="text-ink-faint">·</span>
            <StatusChip status={song.status} />
            <span className="text-ink-faint">·</span>
            <ChartKindIcon kind={chartKind} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Link to={`/catalog/${song.id}/edit`}>
          <Button variant="secondary" type="button" icon="edit">
            {t('common.edit')}
          </Button>
        </Link>
        <Link to={`/catalog/${song.id}/scene`}>
          <Button variant="primary" type="button" icon="play">
            {t('catalog.openScene')}
          </Button>
        </Link>
      </div>
    </header>
  );
}
