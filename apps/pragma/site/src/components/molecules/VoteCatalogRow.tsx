/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AlbumCover } from '../atoms/AlbumCover';
import { Badge } from '../atoms/Badge';
import { PointsBadge } from '../atoms/PointsBadge';
import { ListRow } from './ListRow';

export interface VoteCatalogRowProps {
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
  readonly points: number;
  readonly isNew: boolean;
  readonly onTap: () => void;
}

// @FollowsBlueprint molecule-presentational
export function VoteCatalogRow({
  title,
  artist,
  deezerAlbumId,
  points,
  isNew,
  onTap,
}: VoteCatalogRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <li>
      <ListRow
        onClick={onTap}
        aria-label={t('voting.tapToScore', { title })}
        isChevronShown={false}
        leading={<AlbumCover title={title} deezerAlbumId={deezerAlbumId} size="sm" />}
        className="min-h-12 border-b border-rule px-1 py-1"
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
