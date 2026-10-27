/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useSongLongPress } from '../../lib/song-long-press.hook';
import { AlbumCover } from '../atoms/AlbumCover';
import { Badge } from '../atoms/Badge';
import { PointsBadge } from '../atoms/PointsBadge';
import { ListRow } from './ListRow';

export interface VoteCatalogRowProps {
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
  readonly deezerTrackId: string | null;
  readonly spotifyTrackId: string | null;
  readonly points: number;
  readonly isNew: boolean;
  readonly onTap: () => void;
}

// @FollowsBlueprint molecule-presentational
export function VoteCatalogRow({
  title,
  artist,
  deezerAlbumId,
  deezerTrackId,
  spotifyTrackId,
  points,
  isNew,
  onTap,
}: VoteCatalogRowProps): JSX.Element {
  const { t } = useTranslation();
  const longPress = useSongLongPress({ title, artist, deezerTrackId, spotifyTrackId });

  return (
    <li>
      <ListRow
        onClick={onTap}
        {...longPress}
        aria-label={t('voting.tapToScore', { title })}
        isChevronShown={false}
        leading={<AlbumCover title={title} deezerAlbumId={deezerAlbumId} size="sm" />}
        className="min-h-14 rounded-md bg-leaf px-3 py-2 shadow-leaf select-none"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-ink">{title}</span>
          <span className="block truncate text-label uppercase tracking-wider text-ink-soft">
            {artist}
          </span>
        </span>
        {isNew ? <Badge tone="accent">{t('voting.newSong')}</Badge> : null}
        <PointsBadge points={points} />
      </ListRow>
    </li>
  );
}
