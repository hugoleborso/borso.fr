/** @Feature songs */

import { Link } from 'react-router-dom';
import { AlbumCover } from '../atoms/AlbumCover';
import { Icon } from '../atoms/Icon';
import type { ChartKindTag } from '../../routes/catalog/chart-kind.utils';
import { ChartKindIcon } from '../molecules/ChartKindIcon';
import { type SongStatus, StatusChip } from '../molecules/StatusChip';

export interface SongCardProps {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly deezerAlbumId: string | null;
  readonly status: SongStatus;
  readonly chartKind: ChartKindTag;
}

/**
 * @Blueprint organism-presentational
 * @BlueprintName Presentational Organism
 * @BlueprintUsage Use for a screen region that composes molecules and atoms but owns no state and fetches nothing.
 * @BlueprintDescription Takes every value it draws as a prop, composes molecules and atoms only, and leaves every derived string, here the line under the title, to the route's covered core instead of computing it inline. Holding no state and no query is what lets the route above it decide when the card re-renders.
 */
export function SongCard({
  id,
  title,
  detail,
  deezerAlbumId,
  status,
  chartKind,
}: SongCardProps): JSX.Element {
  return (
    <Link
      to={`/catalog/${id}`}
      className="flex h-full min-h-14 items-center gap-3 border-b border-rule py-1.5 text-ink no-underline hover:bg-hover lg:rounded-md lg:border lg:bg-leaf lg:px-3 lg:py-2.5 lg:hover:border-rule-strong"
    >
      <AlbumCover title={title} deezerAlbumId={deezerAlbumId} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-display text-title leading-tight">{title}</span>
        <span className="truncate text-meta text-ink-soft">{detail}</span>
      </span>
      {chartKind === null ? null : <ChartKindIcon kind={chartKind} />}
      <StatusChip status={status} />
      <Icon name="chevR" size="sm" className="shrink-0 text-ink-faint" />
    </Link>
  );
}
