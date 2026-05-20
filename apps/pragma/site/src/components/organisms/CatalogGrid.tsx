/**
 * CatalogGrid — responsive grid of SongCards. Pure layout shell;
 * the page composes it with a filtered + sorted song list.
 */

import { SongCard, type SongCardProps } from './SongCard';

export interface CatalogGridProps {
  songs: readonly SongCardProps[];
}

export function CatalogGrid({ songs }: CatalogGridProps): JSX.Element {
  return (
    <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {songs.map((song) => (
        <SongCard key={song.id} {...song} />
      ))}
    </div>
  );
}
