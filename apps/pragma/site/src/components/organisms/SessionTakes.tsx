/** @Feature takes */

import { type JSX, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { useTakesOfSession } from '../../lib/queries/takes.queries';
import { takeQueue } from '../../lib/take-queue.setup';
import { findSelectedTakeOfSong, groupTakesBySong } from '../../routes/sessions/session-page.core';
import { mergePendingTakes } from './take-list.core';
import { TakeList } from './TakeList';
import { TakePlayer } from './TakePlayer';

export interface SessionTakesProps {
  readonly sessionId: string;
}

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint organism-query-owning
export function SessionTakes({ sessionId }: SessionTakesProps): JSX.Element {
  const { t } = useTranslation();
  const takesQuery = useTakesOfSession(sessionId);
  const songsQuery = useSongsList();
  const sessionsQuery = useSessionsList();
  const queued = useSyncExternalStore(takeQueue.subscribe, takeQueue.read, takeQueue.readOnServer);
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(null);

  const serverTakes = takesQuery.data?.takes ?? NO_ROWS;
  const sessions = sessionsQuery.data?.sessions ?? NO_ROWS;
  const songTitles = useMemo(
    () => new Map((songsQuery.data?.songs ?? NO_ROWS).map((song) => [song.id, song.title])),
    [songsQuery.data],
  );
  const queuedHere = useMemo(
    () => queued.map((entry) => entry.take).filter((take) => take.sessionId === sessionId),
    [queued, sessionId],
  );
  const groups = useMemo(
    () =>
      groupTakesBySong([...serverTakes, ...queuedHere], (songId) => songTitles.get(songId) ?? ''),
    [serverTakes, queuedHere, songTitles],
  );

  return (
    <section className="flex flex-col gap-3" aria-labelledby="session-takes-title">
      <h2 id="session-takes-title" className="m-0 font-display text-title text-ink">
        {t('sessions.takesTitle')}
      </h2>
      {takesQuery.isError ? (
        <p className="m-0 text-meta text-danger" role="alert">
          {t('common.loadFailed')}
        </p>
      ) : null}
      {takesQuery.isLoading ? (
        <p className="m-0 text-meta text-ink-soft italic">{t('common.loading')}</p>
      ) : null}
      {groups.length === 0 && !takesQuery.isLoading ? (
        <p className="m-0 text-meta text-ink-soft">{t('sessions.noTakeYet')}</p>
      ) : null}
      {groups.map((group) => {
        const selectedTake = findSelectedTakeOfSong(serverTakes, selectedTakeId, group.songId);
        return (
          <div key={group.songId} className="flex flex-col gap-1.5">
            <h3 className="m-0 truncate text-meta font-medium text-ink">{group.songTitle}</h3>
            <TakeList
              rows={mergePendingTakes(
                serverTakes.filter((take) => take.songId === group.songId),
                queuedHere,
                group.songId,
              )}
              sessions={sessions}
              selectedTakeId={selectedTakeId}
              onSelect={setSelectedTakeId}
              onRetry={(takeId) => void takeQueue.retry(takeId)}
            />
            {selectedTake === null ? null : (
              <TakePlayer
                key={selectedTake.id}
                take={selectedTake}
                onClose={() => setSelectedTakeId(null)}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}
