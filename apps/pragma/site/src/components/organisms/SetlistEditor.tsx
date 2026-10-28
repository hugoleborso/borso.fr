/** @Feature setlists */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import {
  type SetlistEntryPatch,
  useAppendSetlistEntry,
  useDeleteSetlistEntry,
  useReorderSetlist,
  useSetlistEntries,
  useUpdateSetlistEntry,
} from '../../lib/queries/setlist-entries.queries';
import { useSongsList, useUpdateSong } from '../../lib/queries/songs.queries';
import { useTransitionCommentsList } from '../../lib/queries/transitions.queries';
import { BottomActions } from '../atoms/BottomActions';
import { Button } from '../atoms/Button';
import { SectionTabs } from '../molecules/SectionTabs';
import { indexLineupChangesTonight } from './entry-lineup-change.core';
import { buildLineupGrid } from './lineup-grid.core';
import { RecordingSheetDialogs } from './RecordingSheet';
import { useRecordingSheet } from './recording-sheet.hook';
import { SetlistEntriesList } from './SetlistEntriesList';
import { type EntrySheetFocus, SetlistEntrySheet } from './SetlistEntrySheet';
import { SetlistViewContent, type SetlistViewName } from './SetlistViewContent';
import { SetlistSongPicker } from './SetlistSongPicker';
import { indexById } from './setlist-editor.utils';
import { describeMemberPartsByEntryId, filterEntriesForMember } from './setlist-filter.core';
import { TransitionCommentModal } from './TransitionCommentModal';
import { buildTransitionViews, indexTransitionComments } from './transition-view.core';

export type SetlistEditorView = SetlistViewName;

interface SetlistEditorProps {
  readonly setlistId: string;
  readonly view: SetlistEditorView;
  readonly memberId: string | null;
  readonly onSelectView: (view: SetlistEditorView) => void;
  readonly onSelectMember: (memberId: string) => void;
}

interface TransitionPair {
  readonly songAId: string;
  readonly songBId: string;
}

interface OpenEntry {
  readonly entryId: string;
  readonly focus: EntrySheetFocus;
}

const NO_ROWS: readonly never[] = [];

type SetlistFailureKey =
  | 'setlist.failure.load'
  | 'setlist.failure.add'
  | 'setlist.failure.remove'
  | 'setlist.failure.reorder'
  | 'setlist.failure.update'
  | 'setlist.failure.songDefaults';

// @FollowsBlueprint organism-query-owning
export function SetlistEditor({
  setlistId,
  view,
  memberId,
  onSelectView,
  onSelectMember,
}: SetlistEditorProps): JSX.Element {
  const { t } = useTranslation();
  const entriesQuery = useSetlistEntries(setlistId);
  const songsQuery = useSongsList();
  const instrumentsQuery = useInstrumentsList();
  const membersQuery = useMembersList();
  const commentsQuery = useTransitionCommentsList();
  const append = useAppendSetlistEntry();
  const updateEntry = useUpdateSetlistEntry();
  const removeEntry = useDeleteSetlistEntry();
  const reorder = useReorderSetlist();
  const updateSong = useUpdateSong();
  const recording = useRecordingSheet();

  const [transitionEditing, setTransitionEditing] = useState<TransitionPair | null>(null);
  const [failureKey, setFailureKey] = useState<SetlistFailureKey | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openEntry, setOpenEntry] = useState<OpenEntry | null>(null);

  const setlistEntries = useMemo(() => entriesQuery.data?.entries ?? NO_ROWS, [entriesQuery.data]);
  const songs = useMemo(() => songsQuery.data?.songs ?? NO_ROWS, [songsQuery.data]);
  const instruments = useMemo(
    () => instrumentsQuery.data?.instruments ?? NO_ROWS,
    [instrumentsQuery.data],
  );
  const members = useMemo(() => membersQuery.data?.members ?? NO_ROWS, [membersQuery.data]);

  const songsById = useMemo(() => indexById(songs), [songs]);
  const membersById = useMemo(() => indexById(members), [members]);
  const lineupMembers = useMemo(
    () => members.map((member) => ({ id: member.id, name: member.firstName, color: member.color })),
    [members],
  );
  const knownMemberIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);
  const transitionViews = useMemo(
    () =>
      buildTransitionViews({
        entries: setlistEntries,
        songsById,
        instruments,
        membersById,
        instrumentsById: indexById(instruments),
      }),
    [setlistEntries, songsById, instruments, membersById],
  );

  const transitionNotesByPair = useMemo(
    () => indexTransitionComments(commentsQuery.data?.comments ?? NO_ROWS),
    [commentsQuery.data],
  );

  const shownMemberId = view === 'my-part' ? memberId : null;
  const filtered = useMemo(
    () => filterEntriesForMember(setlistEntries, songsById, shownMemberId),
    [setlistEntries, songsById, shownMemberId],
  );
  const memberPartByEntryId = useMemo(
    () => describeMemberPartsByEntryId(filtered.instrumentIdsByEntryId, instruments),
    [filtered, instruments],
  );
  const lineupChangesByEntryId = useMemo(
    () => indexLineupChangesTonight({ entries: setlistEntries, songsById, members, instruments }),
    [setlistEntries, songsById, members, instruments],
  );
  const lineupGrid = useMemo(
    () => buildLineupGrid({ entries: setlistEntries, songsById, members, instruments }),
    [setlistEntries, songsById, members, instruments],
  );

  const failWith = (key: SetlistFailureKey) => (): void => setFailureKey(key);

  const addEntry = (songId: string): void => {
    append.mutate(
      {
        setlistId,
        songId,
        energy: songsById[songId]?.baseEnergy ?? null,
        optimisticId: crypto.randomUUID(),
      },
      { onError: failWith('setlist.failure.add') },
    );
  };

  const updateSetlistEntry = (entryId: string, patch: SetlistEntryPatch): void => {
    updateEntry.mutate(
      { setlistId, entryId, ...patch },
      { onError: failWith('setlist.failure.update') },
    );
  };

  const saveSetlistEntry = async (entryId: string, patch: SetlistEntryPatch): Promise<unknown> =>
    updateEntry.mutateAsync({ setlistId, entryId, ...patch });

  if (entriesQuery.isLoading) {
    return <p className="text-meta text-ink-soft italic">{t('common.loading')}</p>;
  }

  const displayFailureKey =
    failureKey ?? (entriesQuery.error === null ? null : 'setlist.failure.load');
  const openedIndex =
    openEntry === null ? -1 : setlistEntries.findIndex((entry) => entry.id === openEntry.entryId);
  const openedEntry = setlistEntries[openedIndex];
  const openedSong = openedEntry === undefined ? undefined : songsById[openedEntry.songId];

  const entriesList = (
    <SetlistEntriesList
      entries={setlistEntries}
      visibleEntries={filtered.visibleEntries}
      songsById={songsById}
      transitionViews={transitionViews}
      transitionNotesByPair={transitionNotesByPair}
      inFilteredMode={view === 'my-part'}
      memberPartByEntryId={memberPartByEntryId}
      lineupMembers={lineupMembers}
      slotInstruments={instruments}
      knownMemberIds={knownMemberIds}
      lineupChangesByEntryId={lineupChangesByEntryId}
      onReorder={(orderedEntryIds) =>
        reorder.mutate(
          { setlistId, entryIds: [...orderedEntryIds] },
          { onError: failWith('setlist.failure.reorder') },
        )
      }
      onOpen={(entryId) => setOpenEntry({ entryId, focus: 'note' })}
      onRemove={(entryId) =>
        removeEntry.mutate({ setlistId, entryId }, { onError: failWith('setlist.failure.remove') })
      }
      onOpenTransition={(songAId, songBId) => setTransitionEditing({ songAId, songBId })}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <SectionTabs
        label={t('setlist.viewLabel')}
        tabs={[
          { value: 'songs', label: t('setlist.viewSongs'), icon: 'song' },
          { value: 'lineup', label: t('setlist.viewLineup'), icon: 'members' },
          { value: 'my-part', label: t('setlist.viewMyPart'), icon: 'user' },
        ]}
        value={view}
        onChange={onSelectView}
      />
      {displayFailureKey === null ? null : (
        <p className="m-0 rounded-md bg-danger-soft px-3 py-2 text-meta text-danger" role="alert">
          {t(displayFailureKey)}
        </p>
      )}
      <SetlistViewContent
        view={view}
        entriesList={entriesList}
        entryIds={setlistEntries.map((entry) => entry.id)}
        memberEntryIds={filtered.visibleEntries.map((entry) => entry.id)}
        shownMember={shownMemberId === null ? undefined : membersById[shownMemberId]}
        lineupGrid={lineupGrid}
        onOpenLineupCell={(entryId) => setOpenEntry({ entryId, focus: 'lineup' })}
        onOpenMember={onSelectMember}
      />
      <BottomActions>
        <Button variant="primary" icon="plus" onClick={() => setPickerOpen(true)}>
          {t('setlist.addSong')}
        </Button>
      </BottomActions>
      <SetlistSongPicker
        open={pickerOpen}
        songs={songs}
        onPick={addEntry}
        onClose={() => setPickerOpen(false)}
      />
      {transitionEditing === null ? null : (
        <TransitionCommentModal
          songAId={transitionEditing.songAId}
          songBId={transitionEditing.songBId}
          songATitle={songsById[transitionEditing.songAId]?.title ?? ''}
          songBTitle={songsById[transitionEditing.songBId]?.title ?? ''}
          onClose={() => setTransitionEditing(null)}
        />
      )}
      {openEntry === null || openedEntry === undefined || openedSong === undefined ? null : (
        <SetlistEntrySheet
          key={openedEntry.id}
          setlistId={setlistId}
          entry={openedEntry}
          song={{
            title: openedSong.title,
            artist: openedSong.artist,
            deezerAlbumId: openedSong.deezerAlbumId ?? null,
            durationSeconds: openedSong.durationSeconds ?? null,
            baseEnergy: openedSong.baseEnergy ?? null,
            defaultLineup: openedSong.defaultLineup,
          }}
          position={openedIndex + 1}
          songCount={setlistEntries.length}
          members={members}
          instruments={instruments}
          focus={openEntry.focus}
          onSave={saveSetlistEntry}
          onUpdate={updateSetlistEntry}
          onSaveSongLineup={(lineup) =>
            updateSong.mutate(
              { id: openedEntry.songId, defaultLineup: lineup },
              { onError: failWith('setlist.failure.songDefaults') },
            )
          }
          onRecordTake={() => {
            setOpenEntry(null);
            void recording.start({
              songId: openedEntry.songId,
              songTitle: openedSong.title,
              sessionId: null,
            });
          }}
          onClose={() => setOpenEntry(null)}
        />
      )}
      <RecordingSheetDialogs controller={recording} />
    </div>
  );
}
