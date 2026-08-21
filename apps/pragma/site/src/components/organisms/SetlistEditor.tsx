/** @Feature setlists */

import { evaluateTransition } from '@domain/transition.core';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { meanDefaultMasteryForSong } from '../../lib/mastery-aggregate.core';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useMasteryDefaults } from '../../lib/queries/mastery.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import {
  type SetlistEntryPatch,
  useAppendSetlistEntry,
  useDeleteSetlistEntry,
  useReorderSetlist,
  useSetlistEntries,
  useUpdateSetlistEntry,
} from '../../lib/queries/setlist-entries.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { useTransitionCommentsList } from '../../lib/queries/transitions.queries';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { BottomActionBar } from '../molecules/BottomActionBar';
import {
  BREAKPOINT_BELOW_LG,
  useIsMediaQueryMatching,
} from '../molecules/media-query-matching.hook';
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

type SetlistFailureKey =
  | 'setlist.failure.load'
  | 'setlist.failure.add'
  | 'setlist.failure.remove'
  | 'setlist.failure.reorder'
  | 'setlist.failure.update'
  | 'setlist.failure.copyOrder';

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
  const [failureKey, setFailureKey] = useState<SetlistFailureKey | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [orderCopied, setOrderCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const setlistEntries = useMemo(() => entriesQuery.data?.entries ?? NO_ROWS, [entriesQuery.data]);
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
    () =>
      setlistEntries.map((entry) => entry.energy ?? songsById[entry.songId]?.baseEnergy ?? null),
    [setlistEntries, songsById],
  );

  const meanMasteryBySongId = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const song of songs)
      out[song.id] = meanDefaultMasteryForSong(song.defaultLineup, masteryDefaults);
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
    for (let index = 0; index < setlistEntries.length - 1; index += 1) {
      const left = setlistEntries[index];
      const right = setlistEntries[index + 1];
      if (left === undefined || right === undefined) continue;
      const verdict = evaluateTransition(
        lineupOf(left, songsById),
        lineupOf(right, songsById),
        instrumentFamilies,
      );
      views.push(buildTransitionView(verdict, membersById, instrumentsById));
    }
    return views;
  }, [setlistEntries, songsById, instrumentFamilies, membersById, instrumentsById]);

  const transitionNotesByPair = useMemo(
    () => indexTransitionComments(commentsQuery.data?.comments ?? NO_ROWS),
    [commentsQuery.data],
  );

  const filtered = useMemo(
    () => filterEntriesForMember(setlistEntries, songsById, selectedMemberId),
    [setlistEntries, songsById, selectedMemberId],
  );
  const knownMemberIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);

  const failWith = (key: SetlistFailureKey) => (): void => setFailureKey(key);

  const addEntry = (songId: string): void => {
    const song = songsById[songId];
    append.mutate(
      {
        setlistId,
        songId,
        energy: song?.baseEnergy ?? null,
        optimisticId: crypto.randomUUID(),
      },
      { onError: failWith('setlist.failure.add') },
    );
  };

  const removeSetlistEntry = (entryId: string): void => {
    removeEntry.mutate({ setlistId, entryId }, { onError: failWith('setlist.failure.remove') });
  };

  const reorderSetlistEntries = (orderedEntryIds: readonly string[]): void => {
    reorder.mutate(
      { setlistId, entryIds: [...orderedEntryIds] },
      { onError: failWith('setlist.failure.reorder') },
    );
  };

  const updateSetlistEntry = (entryId: string, patch: SetlistEntryPatch): void => {
    updateEntry.mutate(
      { setlistId, entryId, ...patch },
      { onError: failWith('setlist.failure.update') },
    );
  };

  const copyOrderToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(formatSetlistOrder(setlistEntries, songsById));
      setOrderCopied(true);
      window.setTimeout(() => setOrderCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      setFailureKey('setlist.failure.copyOrder');
    }
  };

  if (entriesQuery.isLoading) {
    return <p className="text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }

  const displayFailureKey =
    failureKey ?? (entriesQuery.error === null ? null : 'setlist.failure.load');
  const isInFilteredMode = selectedMemberId !== null;
  const visibleEntries = filtered.visibleEntries;

  return (
    <div className="flex flex-col gap-4">
      <SetlistToolbar
        energyValues={energyValues}
        isCompact={isNarrow}
        members={lineupMembers}
        selectedMemberId={selectedMemberId}
        failureMessage={displayFailureKey === null ? null : t(displayFailureKey)}
        onSelectMember={setSelectedMemberId}
      />
      {isInFilteredMode && visibleEntries.length === 0 ? (
        <p className="text-ink-500 italic text-sm py-6 text-center">{t('lineup.emptyForMember')}</p>
      ) : (
        <SetlistEntriesList
          entries={setlistEntries}
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
      {setlistEntries.length === 0 ? (
        <p className="text-ink-500 italic text-sm py-6 text-center">{t('setlist.emptyList')}</p>
      ) : null}
      <BottomActionBar>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void copyOrderToClipboard()}
          disabled={setlistEntries.length === 0}
        >
          <Icon name={orderCopied ? 'check' : 'text'} size={14} />
          {orderCopied ? t('setlist.orderCopied') : t('setlist.copyOrder')}
        </Button>
        <Button variant="accent" size="sm" onClick={() => setPickerOpen(true)}>
          <Icon name="plus" size={14} />
          {t('setlist.addSong')}
        </Button>
      </BottomActionBar>
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
