/** @Feature audience-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../atoms/Badge';
import { Chip } from '../atoms/Chip';
import { composeClassName } from '../atoms/class-name.utils';
import { ListRow } from './ListRow';
import { selectNotConcertReadyLabelKey } from './pool-song-row.core';

export interface PoolSongRowProps {
  readonly title: string;
  readonly artist: string;
  readonly status: string;
  readonly voteCount: number;
  readonly isChosenByThisBallot: boolean;
  readonly isDisabled: boolean;
  readonly onToggle: () => void;
}

// @FollowsBlueprint molecule-presentational
export function PoolSongRow({
  title,
  artist,
  status,
  voteCount,
  isChosenByThisBallot,
  isDisabled,
  onToggle,
}: PoolSongRowProps): JSX.Element {
  const { t } = useTranslation();
  const notConcertReadyLabelKey = selectNotConcertReadyLabelKey(status);
  return (
    <ListRow
      onClick={onToggle}
      disabled={isDisabled}
      aria-pressed={isChosenByThisBallot}
      isChevronShown={false}
      className={composeClassName(
        'rounded-md px-3 py-3 transition-colors sm:px-4 sm:py-3.5',
        'disabled:opacity-60',
        isChosenByThisBallot ? 'bg-ink text-paper' : 'bg-leaf text-ink shadow-leaf',
      )}
    >
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-body truncate">{title}</span>
          {notConcertReadyLabelKey === null ? null : (
            <Chip tone={isChosenByThisBallot ? 'solid' : 'default'}>
              {t(notConcertReadyLabelKey)}
            </Chip>
          )}
        </span>
        <span className="truncate text-meta text-ink-soft">{artist}</span>
      </span>
      <Badge
        tone={isChosenByThisBallot ? 'solid' : 'mono'}
        size="md"
        className="min-w-9 justify-center py-1 text-meta tabular-nums"
      >
        {voteCount}
      </Badge>
    </ListRow>
  );
}
