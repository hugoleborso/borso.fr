/** @Feature practice-mode */

import { type JSX, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { BackLink } from '../../components/molecules/BackLink';
import { EmptyState } from '../../components/molecules/EmptyState';
import { buildLineupColumn } from '../../components/molecules/lineup-slots.core';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { PracticeCurrentSong } from '../../components/organisms/PracticeCurrentSong';
import { PracticeHeader } from '../../components/organisms/PracticeHeader';
import { PracticeNoteSheet } from '../../components/organisms/PracticeNoteSheet';
import { PracticeSongListSheet } from '../../components/organisms/PracticeSongListSheet';
import { RecordingSheetDialogs } from '../../components/organisms/RecordingSheet';
import { useRecordingSheet } from '../../components/organisms/recording-sheet.hook';
import { indexById } from '../../components/organisms/setlist-editor.utils';
import { mergePendingTakes } from '../../components/organisms/take-list.core';
import { TakeList } from '../../components/organisms/TakeList';
import { TakePlayer } from '../../components/organisms/TakePlayer';
import { indexTransitionComments } from '../../components/organisms/transition-view.core';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useStoredPracticePosition } from '../../lib/practice-position.store';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSession, useSessionsList } from '../../lib/queries/sessions.queries';
import {
  useEntriesOfSetlists,
  useUpdateSetlistEntry,
} from '../../lib/queries/setlist-entries.queries';
import { useSetlistsBySession } from '../../lib/queries/setlists.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { useTakesOfSession } from '../../lib/queries/takes.queries';
import { useTransitionCommentsList } from '../../lib/queries/transitions.queries';
import { useSessionLabel } from '../../lib/session-label.hook';
import { takeQueue } from '../../lib/take-queue.setup';
import { buildSceneAddressFromPractice } from '../catalog/scene-view.core';
import {
  buildPracticeScreen,
  buildPracticeSongs,
  describeStoredPosition,
  formatPracticeNextLine,
  isPracticeModeOffered,
  parseStoredPracticePosition,
  resolvePracticeIndex,
  selectPracticeAnchor,
  serializePracticePosition,
  type StoredPracticePosition,
} from './practice-mode.core';
import { buildPracticePath } from './session-page.core';

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint route-detail-page
export function PracticeModePage(): JSX.Element {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  if (sessionId === undefined) {
    return (
      <NotFoundNotice
        message={t('sessions.sessionNotFound')}
        backTo="/sessions"
        backLabel={t('sessions.title')}
      />
    );
  }
  return <PracticeMode sessionId={sessionId} />;
}

function PracticeMode({ sessionId }: { readonly sessionId: string }): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const labelOf = useSessionLabel();
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const sessionQuery = useSession(sessionId);
  const sessionsQuery = useSessionsList();
  const setlistsQuery = useSetlistsBySession(sessionId);
  const setlists = setlistsQuery.data?.setlists ?? NO_ROWS;
  const setlistEntries = useEntriesOfSetlists(setlists.map((setlist) => setlist.id));
  const songsQuery = useSongsList();
  const membersQuery = useMembersList();
  const instrumentsQuery = useInstrumentsList();
  const commentsQuery = useTransitionCommentsList();
  const takesQuery = useTakesOfSession(sessionId);
  const queued = useSyncExternalStore(takeQueue.subscribe, takeQueue.read, takeQueue.readOnServer);
  const position = useStoredPracticePosition(sessionId);
  const recording = useRecordingSheet();
  const updateEntry = useUpdateSetlistEntry();
  const [isSongListOpen, setIsSongListOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(null);
  const [arrival, setArrival] = useState<StoredPracticePosition | null>(null);

  const now = new Date(nowEpochMs);
  const songs = useMemo(
    () => buildPracticeSongs(setlists, setlistEntries.entriesBySetlistId),
    [setlists, setlistEntries.entriesBySetlistId],
  );
  const songsById = useMemo(() => indexById(songsQuery.data?.songs ?? NO_ROWS), [songsQuery.data]);
  const entriesById = useMemo(
    () => indexById(Object.values(setlistEntries.entriesBySetlistId).flat()),
    [setlistEntries.entriesBySetlistId],
  );
  const transitionNotesByPair = useMemo(
    () => indexTransitionComments(commentsQuery.data?.comments ?? NO_ROWS),
    [commentsQuery.data],
  );
  const anchor = selectPracticeAnchor(
    parseStoredPracticePosition(position.storedText),
    arrival,
    now,
  );
  const index = resolvePracticeIndex(songs, anchor, now);
  const shownOnArrival = arrival === null ? describeStoredPosition(songs, index, now) : null;
  if (shownOnArrival !== null) setArrival(shownOnArrival);
  const screen = buildPracticeScreen({
    songs,
    index,
    entriesById,
    songsById,
    transitionNotesByPair,
  });
  const session = sessionQuery.data?.session ?? null;
  const sessionPath = `/sessions/${sessionId}`;

  if (sessionQuery.isLoading || setlistsQuery.isLoading || setlistEntries.isLoading) {
    return (
      <p className="px-4 py-4 text-meta text-ink-soft italic sm:px-9 sm:py-7">
        {t('common.loading')}
      </p>
    );
  }
  if (session === null) {
    return (
      <NotFoundNotice
        message={t('sessions.sessionNotFound')}
        backTo="/sessions"
        backLabel={t('sessions.title')}
      />
    );
  }

  const sessionLabel = labelOf(session);
  const isOffered = isPracticeModeOffered({
    kind: session.kind,
    date: session.date,
    songCount: songs.length,
    now,
  });
  const current = screen.current;
  if (!isOffered || current === null) {
    return (
      <section className="flex flex-col gap-4 px-4 py-4 sm:px-9 sm:py-7">
        <BackLink to={sessionPath} label={sessionLabel} />
        <EmptyState icon="sessions">{t('practice.notOffered')}</EmptyState>
      </section>
    );
  }

  const moveTo = (nextIndex: number): void => {
    const stored = serializePracticePosition(songs, nextIndex, now);
    if (stored !== null) position.save(stored);
    setSelectedTakeId(null);
  };
  const endPractice = (): void => {
    position.forget();
    navigateTo(sessionPath);
  };
  const recordTake = (): void => {
    void recording.start({ songId: current.entry.songId, songTitle: current.title, sessionId });
  };

  const serverTakes = (takesQuery.data?.takes ?? NO_ROWS).filter(
    (take) => take.songId === current.entry.songId,
  );
  const takeRows = mergePendingTakes(
    serverTakes,
    queued.map((entry) => entry.take).filter((take) => take.sessionId === sessionId),
    current.entry.songId,
  );
  const selectedTake = serverTakes.find((take) => take.id === selectedTakeId) ?? null;
  const nextLine = formatPracticeNextLine(screen.next);

  return (
    <section className="flex max-w-[720px] flex-col gap-4 px-4 pt-1 pb-4 sm:px-9 sm:py-7">
      <PracticeHeader
        sessionPath={sessionPath}
        sessionLabel={sessionLabel}
        number={screen.position.number}
        count={screen.position.count}
        setlistName={screen.position.currentSetlistName}
        onEnd={endPractice}
        onOpenSetlist={() => navigateTo(`/setlists/${current.setlistId}`)}
        onOpenSongList={() => setIsSongListOpen(true)}
      />

      <PracticeCurrentSong
        title={current.title}
        artist={current.artist}
        deezerAlbumId={current.deezerAlbumId}
        keyLabel={current.keyLabel}
        capo={current.entry.capo}
        lineupColumn={buildLineupColumn({
          instruments: instrumentsQuery.data?.instruments ?? NO_ROWS,
          lineup: current.lineup,
          members: membersQuery.data?.members ?? NO_ROWS,
        })}
        note={current.entry.notes}
        transitionNote={current.transitionNote}
        chordsTo={buildSceneAddressFromPractice(current.entry.songId, buildPracticePath(sessionId))}
        onOpenNote={() => setIsNoteOpen(true)}
      />

      <section className="flex flex-col gap-1.5" aria-labelledby="practice-takes-title">
        <h2
          id="practice-takes-title"
          className="m-0 text-label font-medium text-ink-soft uppercase"
        >
          {t('practice.takesTitle')}
        </h2>
        <TakeList
          rows={takeRows}
          sessions={sessionsQuery.data?.sessions ?? NO_ROWS}
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
      </section>

      {nextLine === null ? null : (
        <p className="m-0 text-meta text-ink-soft">{t('practice.next', { song: nextLine })}</p>
      )}

      {isSongListOpen ? (
        <PracticeSongListSheet
          songs={songs.map((song) => ({
            entryId: song.entryId,
            title: songsById[song.songId]?.title ?? '',
            setlistName: song.setlistName,
          }))}
          currentIndex={index}
          onPick={(pickedIndex) => {
            moveTo(pickedIndex);
            setIsSongListOpen(false);
          }}
          onClose={() => setIsSongListOpen(false)}
        />
      ) : null}
      {isNoteOpen ? (
        <PracticeNoteSheet
          key={current.entry.id}
          setlistId={current.setlistId}
          entry={current.entry}
          songTitle={current.title}
          onSaveNote={(text) =>
            updateEntry.mutateAsync({
              setlistId: current.setlistId,
              entryId: current.entry.id,
              notes: text,
            })
          }
          onClose={() => setIsNoteOpen(false)}
        />
      ) : null}
      <RecordingSheetDialogs controller={recording} />

      <BottomActions>
        {screen.position.isLast ? (
          <Button icon="check" variant="secondary" onClick={endPractice}>
            {t('practice.end')}
          </Button>
        ) : (
          <Button
            icon="chevR"
            variant="secondary"
            disabled={recording.view.isOpen}
            onClick={() => moveTo(index + 1)}
          >
            {t('practice.nextSong')}
          </Button>
        )}
        <Button icon="mic" variant="primary" disabled={recording.view.isOpen} onClick={recordTake}>
          {t('practice.recordTake')}
        </Button>
      </BottomActions>
    </section>
  );
}
