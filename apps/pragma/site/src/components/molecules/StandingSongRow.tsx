/** @Feature audience-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../atoms/Badge';
import { Chip } from '../atoms/Chip';
import { selectNotConcertReadyLabelKey } from './pool-song-row.core';

export interface StandingSongRowProps {
  readonly title: string;
  readonly artist: string;
  readonly status: string;
  readonly voteCount: number;
}

// @FollowsBlueprint molecule-presentational
export function StandingSongRow({
  title,
  artist,
  status,
  voteCount,
}: StandingSongRowProps): JSX.Element {
  const { t } = useTranslation();
  const notConcertReadyLabelKey = selectNotConcertReadyLabelKey(status);
  return (
    <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-line bg-bg-elev text-ink-900">
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-[15px] truncate">{title}</span>
          {notConcertReadyLabelKey === null ? null : <Chip>{t(notConcertReadyLabelKey)}</Chip>}
        </span>
        <span className="text-[12.5px] text-ink-500 truncate">{artist}</span>
      </span>
      <Badge
        tone="mono"
        size="md"
        className="font-mono tabular-nums text-sm min-w-9 justify-center py-1"
      >
        {voteCount}
      </Badge>
    </div>
  );
}
