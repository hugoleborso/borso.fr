/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../atoms/Badge';
import { PointsBadge } from '../atoms/PointsBadge';

export interface VoteCatalogRowProps {
  readonly title: string;
  readonly artist: string;
  readonly points: number;
  readonly isNew: boolean;
  readonly onTap: () => void;
}

// @FollowsBlueprint molecule-presentational
export function VoteCatalogRow({
  title,
  artist,
  points,
  isNew,
  onTap,
}: VoteCatalogRowProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <li>
      <button
        type="button"
        onClick={onTap}
        aria-label={t('voting.tapToScore', { title })}
        className="w-full min-h-14 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-left cursor-pointer"
      >
        <span className="flex-1 min-w-0">
          <span className="block truncate text-ink-900">{title}</span>
          <span className="block truncate text-xs uppercase tracking-wider text-ink-400">
            {artist}
          </span>
        </span>
        {isNew ? <Badge tone="accent">{t('voting.newSong')}</Badge> : null}
        <PointsBadge points={points} />
      </button>
    </li>
  );
}
