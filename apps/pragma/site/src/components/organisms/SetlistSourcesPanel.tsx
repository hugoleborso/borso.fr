/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useSetlistsList } from '../../lib/queries/setlists.queries';
import { buildSetlistIndexRows } from '../../lib/setlist-index.core';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { Icon } from '../atoms/Icon';
import { CheckableRow } from '../molecules/CheckableRow';
import { PickableSongRow } from '../molecules/PickableSongRow';
import {
  buildSourceSongRows,
  listSourceSetlists,
  type SourceSetlistToggle,
  toggleSourceSetlist,
} from './add-songs-from-setlists.core';

export interface SourceSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
}

export interface SetlistSourcesPanelProps {
  readonly setlistId: string;
  readonly setlistSongIds: readonly string[];
  readonly songsById: Readonly<Record<string, SourceSong>>;
  readonly pickedSetlistIds: readonly string[];
  readonly pickedSongIds: readonly string[];
  readonly isDisabled: boolean;
  readonly onToggleSetlist: (next: SourceSetlistToggle) => void;
  readonly onToggleSong: (songId: string) => void;
}

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint organism-query-owning
export function SetlistSourcesPanel(props: SetlistSourcesPanelProps): JSX.Element {
  const { t } = useTranslation();
  const setlistsQuery = useSetlistsList();
  const sessionsQuery = useSessionsList();
  const allSetlists = setlistsQuery.data?.setlists ?? NO_ROWS;
  const sessions = sessionsQuery.data?.sessions ?? NO_ROWS;
  const orderedIds = buildSetlistIndexRows(allSetlists, sessions).map((row) => row.id);
  const sourceSetlists = listSourceSetlists(allSetlists, orderedIds, props.setlistId);
  const songRows = buildSourceSongRows({
    pickedSetlistIds: props.pickedSetlistIds,
    setlists: allSetlists,
    setlistSongIds: props.setlistSongIds,
    songsById: props.songsById,
    pickedSongIds: props.pickedSongIds,
  });

  return (
    <div className="flex flex-col gap-3">
      <ul
        aria-label={t('setlist.addSongsFromSetlists')}
        className="m-0 flex list-none flex-col p-0"
      >
        {sourceSetlists.map((setlist) => (
          <li key={setlist.id}>
            <CheckableRow
              title={selectSetlistDisplayName(setlist.name, t('setlist.untitled'))}
              detail={t('setlist.songCount', { count: setlist.songCount })}
              leading={<Icon name="setlist" className="shrink-0 text-accent" />}
              isChecked={props.pickedSetlistIds.includes(setlist.id)}
              isDisabled={props.isDisabled}
              onToggle={() =>
                props.onToggleSetlist(
                  toggleSourceSetlist({
                    sourceSetlistId: setlist.id,
                    pickedSetlistIds: props.pickedSetlistIds,
                    pickedSongIds: props.pickedSongIds,
                    setlists: allSetlists,
                    setlistSongIds: props.setlistSongIds,
                  }),
                )
              }
            />
          </li>
        ))}
        {sourceSetlists.length === 0 ? (
          <li className="px-1 py-4 text-meta text-ink-soft">
            {t('setlist.addSongsNoSourceSetlist')}
          </li>
        ) : null}
      </ul>
      {songRows.length === 0 ? null : (
        <section className="flex flex-col gap-1">
          <h3 className="m-0 px-1 text-label font-semibold text-ink-soft uppercase">
            {t('setlist.addSongsSetlistSongs')}
          </h3>
          <ul className="m-0 flex list-none flex-col p-0">
            {songRows.map((row) => (
              <li key={row.song.id}>
                <PickableSongRow
                  title={row.song.title}
                  detail={row.song.artist}
                  deezerAlbumId={row.song.deezerAlbumId}
                  pickNumber={row.pickNumber}
                  isAlreadyIn={false}
                  isDisabled={props.isDisabled}
                  onToggle={() => props.onToggleSong(row.song.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
