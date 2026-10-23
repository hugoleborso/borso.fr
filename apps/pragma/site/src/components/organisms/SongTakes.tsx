/** @Feature takes */

import { type JSX, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useTakesOfSong } from '../../lib/queries/takes.queries';
import { takeQueue } from '../../lib/take-queue.setup';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { mergePendingTakes } from './take-list.core';
import { RecordingSheet } from './RecordingSheet';
import { TakeList } from './TakeList';
import { TakePlayer } from './TakePlayer';
import { TakeUploadForm } from './TakeUploadForm';

export interface SongTakesProps {
  readonly songId: string;
  readonly songTitle: string;
  readonly selectedTakeId: string | null;
  readonly onSelectTake: (takeId: string | null) => void;
}

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint organism-query-owning
export function SongTakes({
  songId,
  songTitle,
  selectedTakeId,
  onSelectTake,
}: SongTakesProps): JSX.Element {
  const { t } = useTranslation();
  const takesQuery = useTakesOfSong(songId);
  const sessionsQuery = useSessionsList();
  const queued = useSyncExternalStore(takeQueue.subscribe, takeQueue.read, takeQueue.readOnServer);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const serverTakes = takesQuery.data?.takes ?? NO_ROWS;
  const sessions = sessionsQuery.data?.sessions ?? NO_ROWS;
  const rows = useMemo(
    () =>
      mergePendingTakes(
        serverTakes,
        queued.map((entry) => entry.take),
        songId,
      ),
    [serverTakes, queued, songId],
  );
  const selectedTake = serverTakes.find((take) => take.id === selectedTakeId) ?? null;

  return (
    <Card>
      <div className="flex items-center gap-2 flex-wrap mb-2.5">
        <h2 className="text-xs tracking-wider uppercase text-ink-400 font-medium flex-1 m-0">
          {t('takes.title')}
        </h2>
        <RecordingSheet songId={songId} songTitle={songTitle} sessionId={null} />
        <Button variant="default" onClick={() => setIsUploadOpen(true)}>
          <Icon name="upload" size={14} />
          {t('takes.upload')}
        </Button>
      </div>
      {takesQuery.isError ? (
        <p className="text-danger text-sm m-0 mb-2" role="alert">
          {t('common.loadFailed')}
        </p>
      ) : null}
      {takesQuery.isLoading ? (
        <p className="text-ink-400 italic text-sm m-0">{t('common.loading')}</p>
      ) : (
        <TakeList
          rows={rows}
          sessions={sessions}
          selectedTakeId={selectedTakeId}
          onSelect={onSelectTake}
          onRetry={(takeId) => void takeQueue.retry(takeId)}
        />
      )}
      {selectedTake === null ? null : (
        <div className="mt-3">
          <TakePlayer
            key={selectedTake.id}
            take={selectedTake}
            onClose={() => onSelectTake(null)}
          />
        </div>
      )}
      {isUploadOpen ? (
        <TakeUploadForm
          songId={songId}
          songTitle={songTitle}
          presetSessionId={null}
          onClose={() => setIsUploadOpen(false)}
        />
      ) : null}
    </Card>
  );
}
