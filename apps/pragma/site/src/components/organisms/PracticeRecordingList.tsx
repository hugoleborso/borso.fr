/** @Feature takes */

import { type JSX, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSetlistEntries } from '../../lib/queries/setlist-entries.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { RecordingSheet } from './RecordingSheet';

export interface PracticeRecordingListProps {
  readonly sessionId: string;
  readonly setlists: readonly { readonly id: string; readonly name: string }[];
}

interface PracticeSetlistSongsProps {
  readonly sessionId: string;
  readonly setlistId: string;
  readonly setlistName: string;
  readonly songTitles: ReadonlyMap<string, string>;
}

function PracticeSetlistSongs({
  sessionId,
  setlistId,
  setlistName,
  songTitles,
}: PracticeSetlistSongsProps): JSX.Element {
  const { t } = useTranslation();
  const entriesQuery = useSetlistEntries(setlistId);
  const setlistEntries = entriesQuery.data?.entries ?? [];

  return (
    <li className="flex flex-col gap-1">
      <span className="text-meta text-ink-soft">{setlistName}</span>
      {entriesQuery.isLoading ? (
        <p className="text-ink-soft italic text-meta m-0">{t('common.loading')}</p>
      ) : (
        <ul className="flex flex-col m-0 p-0 list-none divide-y divide-rule">
          {setlistEntries.map((entry) => {
            const title = songTitles.get(entry.songId) ?? '';
            return (
              <li key={entry.id} className="flex items-center gap-2 py-0.5">
                <span className="flex-1 min-w-0 truncate text-meta text-ink">{title}</span>
                <RecordingSheet
                  songId={entry.songId}
                  songTitle={title}
                  sessionId={sessionId}
                  isCompact
                />
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

// @FollowsBlueprint organism-query-owning
export function PracticeRecordingList({
  sessionId,
  setlists,
}: PracticeRecordingListProps): JSX.Element {
  const { t } = useTranslation();
  const songsQuery = useSongsList();
  const songTitles = useMemo(
    () => new Map((songsQuery.data?.songs ?? []).map((song) => [song.id, song.title])),
    [songsQuery.data],
  );

  return (
    <section className="flex flex-col gap-2" aria-label={t('takes.practiceList.title')}>
      <h3 className="font-display text-title text-ink m-0">{t('takes.practiceList.title')}</h3>
      {setlists.length === 0 ? (
        <p className="text-ink-soft italic text-meta m-0">{t('takes.practiceList.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3 m-0 p-0 list-none">
          {setlists.map((setlist) => (
            <PracticeSetlistSongs
              key={setlist.id}
              sessionId={sessionId}
              setlistId={setlist.id}
              setlistName={setlist.name}
              songTitles={songTitles}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
