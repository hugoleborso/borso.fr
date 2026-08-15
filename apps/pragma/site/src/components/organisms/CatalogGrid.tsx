/**
 * CatalogGrid — responsive grid of SongCards. Pure layout shell;
 * the page composes it with a filtered + sorted song list.
 *
 * `trailing` closes the grid with whatever the page wants reachable once the
 * list has been read — the create control, which at the top of a list nearly
 * two screens tall is a scroll back up and a stretch away from the thumb.
 */

import type { ReactNode } from 'react';
import { SongCard, type SongCardProps } from './SongCard';

export interface CatalogGridProps {
  songs: readonly SongCardProps[];
  trailing?: ReactNode;
}

// @FollowsBlueprint organism-presentational
export function CatalogGrid({ songs, trailing }: CatalogGridProps): JSX.Element {
  return (
    <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {songs.map((song) => (
        <SongCard key={song.id} {...song} />
      ))}
      {trailing}
    </div>
  );
}
