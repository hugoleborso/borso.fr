/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { canStepDown, canStepUp, type PointStep } from '../../routes/setlists/vote-deck.core';
import { AlbumCover } from '../atoms/AlbumCover';
import { Badge } from '../atoms/Badge';
import { IconButton } from '../atoms/IconButton';
import { PointsBadge } from '../atoms/PointsBadge';

export interface VoteCatalogRowProps {
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
  readonly points: number;
  readonly remainingPoints: number;
  readonly isNew: boolean;
  readonly onStep: (step: PointStep) => void;
}

// @FollowsBlueprint molecule-presentational
export function VoteCatalogRow({
  title,
  artist,
  deezerAlbumId,
  points,
  remainingPoints,
  isNew,
  onStep,
}: VoteCatalogRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <li className="flex min-h-12 items-center gap-2 border-b border-rule px-1 py-1">
      <AlbumCover title={title} deezerAlbumId={deezerAlbumId} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-ink">{title}</span>
        <span className="block truncate text-label uppercase tracking-wider text-ink-soft">
          {artist}
        </span>
      </span>
      {isNew ? <Badge tone="accent">{t('voting.newSong')}</Badge> : null}
      <IconButton
        icon="minus"
        label={t('voting.removePoint', { title })}
        disabled={!canStepDown(points)}
        onClick={() => onStep('down')}
      />
      <PointsBadge points={points} aria-label={t('voting.pointsGiven', { count: points })} />
      <IconButton
        icon="plus"
        label={t('voting.addPoint', { title })}
        disabled={!canStepUp(points, remainingPoints)}
        onClick={() => onStep('up')}
      />
    </li>
  );
}
