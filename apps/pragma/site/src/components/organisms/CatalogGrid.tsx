/** @Feature songs */

import { SongCard, type SongCardProps } from './SongCard';

export interface CatalogGridProps {
  songs: readonly SongCardProps[];
}

// @FollowsBlueprint organism-presentational
export function CatalogGrid({ songs }: CatalogGridProps): JSX.Element {
  return (
    <div className="grid gap-2.5 sm:gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {songs.map((song) => (
        <SongCard key={song.id} {...song} />
      ))}
    </div>
  );
}
