/**
 * Setlist editor. Embedded inside the concert session detail page.
 * Renders the ordered entries; each row carries an inline display
 * (title, artist, tonality, mastery, lineup, energy slider).
 *
 * The energy curve, the member filter and the two set-level actions sit in
 * `SetlistToolbar`, pinned to the top of the page, so the curve stays in view
 * while rows move under it.
 *
 * Reordering uses dnd-kit's sortable list (see `SetlistEntriesList`):
 * the list is a `DndContext` wrapping a `SortableContext`, each row is
 * a sortable node grabbed by its handle, and the drop is committed via
 * the optimistic `useReorderSetlist` mutation.
 *
 * Between every two consecutive rows sits a `TransitionStrip`: the verdict
 * from `domain/transition.core.ts` — who keeps a harmonic instrument across
 * the pair, who backs them up, and whether the gap is risky — plus the note
 * stored on that ordered song pair. Tapping the strip opens the note editor.
 *
 * When a member is selected in the filter, `filterEntriesForMember` keeps only
 * entries where that member plays; each visible row receives a
 * `prominentMemberInstrument` chip describing what they play here, and the
 * strips are hidden because the gaps between the visible rows are no longer
 * the gaps of the set.
 */

import { evaluateTransition } from '@domain/transition.core';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { meanMasteryForSong } from '../../lib/mastery-aggregate.utils';
import { useInstrumentsList } from '../../lib/queries/instruments';
import { useMasteryDefaults } from '../../lib/queries/mastery';
import { useMembersList } from '../../lib/queries/members';
import {
  useAppendSetlistEntry,
  useDeleteSetlistEntry,
  useReorderSetlist,
  useSetlistEntries,
  useUpdateSetlistEntry,
} from '../../lib/queries/setlists';
import { useSongsList } from '../../lib/queries/songs';
import { useTransitionCommentsList } from '../../lib/queries/transitions';
import { BREAKPOINT_BELOW_LG, useIsMediaQueryMatching } from '../molecules/useIsMediaQueryMatching';
import { SetlistEntriesList } from './SetlistEntriesList';
import { SetlistSongPicker } from './SetlistSongPicker';
import { SetlistToolbar } from './SetlistToolbar';
import { formatSetlistOrder, instrumentFamilyMap, lineupOf } from './setlist-editor.utils';
import { filterEntriesForMember } from './setlist-filter.core';
import { TransitionCommentModal } from './TransitionCommentModal';
import { buildTransitionView, indexTransitionComments } from './transition-view.core';

interface SetlistEditorProps {
  readonly setlistId: string;
}

const NO_ROWS: readonly never[] = [];
const COPIED_FEEDBACK_MS = 2000;

// @FollowsBlueprint organism-query-owning
export function SetlistEditor({ setlistId }: SetlistEditorProps): JSX.Element {
  const { t } = useTranslation();
  const entriesQuery = useSetlistEntries(setlistId);
  const songsQuery = useSongsList();
  const instrumentsQuery = useInstrumentsList();
  const membersQuery = useMembersList();
  const masteryQuery = useMasteryDefaults();
  const commentsQuery = useTransitionCommentsList();
  const append = useAppendSetlistEntry();
  const updateEntry = useUpdateSetlistEntry();
  const removeEntry = useDeleteSetlistEntry();
  const reorder = useReorderSetlist();
  const isNarrow = useIsMediaQueryMatching(BREAKPOINT_BELOW_LG);

  const [transitionEditing, setTransitionEditing] = useState<{
    songAId: string;
    songBId: string;
  } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [orderCopied, setOrderCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const entries = useMemo(() => entriesQuery.data?.entries ?? NO_ROWS, [entriesQuery.data]);
  const songs = useMemo(() => songsQuery.data?.songs ?? NO_ROWS, [songsQuery.data]);
  const instruments = useMemo(
    () => instrumentsQuery.data?.instruments ?? NO_ROWS,
    [instrumentsQuery.data],
  );
  const members = useMemo(() => membersQuery.data?.members ?? NO_ROWS, [membersQuery.data]);
  const masteryDefaults = useMemo(
    () => masteryQuery.data?.defaults ?? NO_ROWS,
    [masteryQuery.data],
  );

  const songsById = useMemo(() => {
    const out: Record<string, (typeof songs)[number]> = {};
    for (const song of songs) out[song.id] = song;
    return out;
  }, [songs]);

  const instrumentFamilies = useMemo(() => instrumentFamilyMap(instruments), [instruments]);

  const lineupMembers = useMemo(
    () => members.map((member) => ({ id: member.id, name: member.firstName, color: member.color })),
    [members],
  );

  const energyValues = useMemo(
    () => entries.map((entry) => entry.energy ?? songsById[entry.songId]?.baseEnergy ?? null),
    [entries, songsById],
  );

  const meanMasteryBySongId = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const song of songs)
      out[song.id] = meanMasteryForSong(song.defaultLineup, masteryDefaults);
    return out;
  }, [songs, masteryDefaults]);

  const membersById = useMemo(() => {
    const out: Record<string, (typeof members)[number]> = {};
    for (const member of members) out[member.id] = member;
    return out;
  }, [members]);
  const instrumentsById = useMemo(() => {
    const out: Record<string, (typeof instruments)[number]> = {};
    for (const instrument of instruments) out[instrument.id] = instrument;
    return out;
  }, [instruments]);

  const transitionViews = useMemo(() => {
    const views = [];
    for (let index = 0; index < entries.length - 1; index += 1) {
      const left = entries[index];
      const right = entries[index + 1];
      if (left === undefined || right === undefined) continue;
      const verdict = evaluateTransition(
        lineupOf(left, songsById),
        lineupOf(right, songsById),
        instrumentFamilies,
      );
      views.push(buildTransitionView(verdict, membersById, instrumentsById));
    }
    return views;
  }, [entries, songsById, instrumentFamilies, membersById, instrumentsById]);

  const transitionNotesByPair = useMemo(
    () => indexTransitionComments(commentsQuery.data?.comments ?? NO_ROWS),
    [commentsQuery.data],
  );

  const filtered = useMemo(
    () => filterEntriesForMember(entries, songsById, selectedMemberId),
    [entries, songsById, selectedMemberId],
  );
  const knownMemberIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);

  const recordError = (error: Error): void =>
    setLocalError(error instanceof ApiError ? error.message : 'unknown-error');

  const addEntry = (songId: string): void => {
    const song = songsById[songId];
    append.mutate(
      {
        setlistId,
        songId,
        energy: song?.baseEnergy ?? null,
        optimisticId: crypto.randomUUID(),
      },
      { onError: recordError },
    );
  };

  const removeSetlistEntry = (entryId: string): void => {
    removeEntry.mutate({ setlistId, entryId }, { onError: recordError });
  };

  const reorderSetlistEntries = (orderedEntryIds: readonly string[]): void => {
    reorder.mutate({ setlistId, entryIds: [...orderedEntryIds] }, { onError: recordError });
  };

  const updateSetlistEntry = (entryId: string, patch: Record<string, unknown>): void => {
    updateEntry.mutate({ setlistId, entryId, ...patch }, { onError: recordError });
  };

  const copyOrderToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(formatSetlistOrder(entries, songsById));
      setOrderCopied(true);
      window.setTimeout(() => setOrderCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      setLocalError('clipboard-error');
    }
  };

  if (entriesQuery.isLoading) {
    return <p className="text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }

  const queryError = entriesQuery.error instanceof ApiError ? entriesQuery.error.message : null;
  const displayError = localError ?? queryError;
  const isInFilteredMode = selectedMemberId !== null;
  const visibleEntries = filtered.visibleEntries;

  return (
    <div className="flex flex-col gap-4">
      <SetlistToolbar
        energyValues={energyValues}
        isCompact={isNarrow}
        members={lineupMembers}
        selectedMemberId={selectedMemberId}
        entryCount={entries.length}
        isOrderCopied={orderCopied}
        onSelectMember={setSelectedMemberId}
        onAddSong={() => setPickerOpen(true)}
        onCopyOrder={() => void copyOrderToClipboard()}
      />
      {displayError === null ? null : (
        <p className="text-danger text-sm" role="alert">
          {displayError}
        </p>
      )}
      {isInFilteredMode && visibleEntries.length === 0 ? (
        <p className="text-ink-500 italic text-sm py-6 text-center">{t('lineup.emptyForMember')}</p>
      ) : (
        <SetlistEntriesList
          entries={entries}
          visibleEntries={visibleEntries}
          songsById={songsById}
          transitionViews={transitionViews}
          transitionNotesByPair={transitionNotesByPair}
          meanMasteryBySongId={meanMasteryBySongId}
          inFilteredMode={isInFilteredMode}
          selectedMemberId={selectedMemberId}
          filteredInstrumentIdsByEntryId={filtered.instrumentIdsByEntryId}
          lineupMembers={lineupMembers}
          instruments={instruments}
          membersById={membersById}
          instrumentsById={instrumentsById}
          knownMemberIds={knownMemberIds}
          onReorder={reorderSetlistEntries}
          onUpdate={updateSetlistEntry}
          onRemove={removeSetlistEntry}
          onOpenTransition={(songAId, songBId) => setTransitionEditing({ songAId, songBId })}
        />
      )}
      {entries.length === 0 ? (
        <p className="text-ink-500 italic text-sm py-6 text-center">{t('setlist.emptyList')}</p>
      ) : null}
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
    </div>
  );
}
