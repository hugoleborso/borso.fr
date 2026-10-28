/** @Feature songs */

import { SongCard, type SongCardProps } from './SongCard';

export interface CatalogListProps {
  readonly songs: readonly SongCardProps[];
}

// @FollowsBlueprint organism-presentational
export function CatalogList({ songs }: CatalogListProps): JSX.Element {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {songs.map((song) => (
        <li key={song.id}>
          <SongCard {...song} />
        </li>
      ))}
    </ul>
  );
}
