/** @Feature audience-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../atoms/Badge';
import { Chip } from '../atoms/Chip';
import { composeClassName } from '../atoms/class-name.utils';
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
    <button
      type="button"
      onClick={onToggle}
      disabled={isDisabled}
      aria-pressed={isChosenByThisBallot}
      className={composeClassName(
        'w-full flex items-center gap-3 px-3 py-3 sm:px-4 sm:py-3.5 rounded-md border text-left transition-colors',
        'disabled:opacity-60',
        isChosenByThisBallot
          ? 'bg-ink-900 text-bg border-ink-900'
          : 'bg-bg-elev text-ink-900 border-line',
      )}
    >
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-[15px] truncate">{title}</span>
          {notConcertReadyLabelKey === null ? null : (
            <Chip tone={isChosenByThisBallot ? 'solid' : 'default'}>
              {t(notConcertReadyLabelKey)}
            </Chip>
          )}
        </span>
        <span className="text-[12.5px] opacity-70 truncate">{artist}</span>
      </span>
      <Badge
        tone={isChosenByThisBallot ? 'solid' : 'mono'}
        size="md"
        className="font-mono tabular-nums text-sm min-w-9 justify-center py-1"
      >
        {voteCount}
      </Badge>
    </button>
  );
}
