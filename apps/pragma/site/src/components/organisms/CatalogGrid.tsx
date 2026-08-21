/** @Feature songs */

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
