/**
 * Setlist editor. Embedded inside the concert session detail page.
 * Renders the ordered entries; each row carries an inline display
 * (title, artist, tonality, mastery, lineup, energy slider). The
 * energy sparkline sits ABOVE the list, derived from the per-entry
 * energy values.
 *
 * Reordering uses dnd-kit's sortable list (see `SetlistEntriesList`):
 * the list is a `DndContext` wrapping a `SortableContext`, each row is
 * a sortable node grabbed by its handle, and the drop is committed via
 * the optimistic `useReorderSetlist` mutation. Transition warnings are
 * computed by `transition.core.ts` between each consecutive pair; a
 * warned pair carries a circular orange marker in the side gutter
 * (`WarnMarkerGutter`), which opens the TransitionCommentModal.
 *
 * Above the list, a sticky `<MemberFilterPills>` row lets the operator
 * narrow the view to a single member's perspective. When a member is
 * selected, `filterEntriesForMember` keeps only entries where that
 * member plays an instrument; each visible row receives a
 * `prominentMemberInstrument` chip describing what they play here.
 */

import { evaluateTransition } from '@api/setlists/transition.core';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { EnergySparkline } from '../../components/molecules/EnergySparkline';
import { MemberFilterPills } from '../../components/molecules/MemberFilterPills';
import { ApiError } from '../../lib/api';
import { useInstrumentsList } from '../../lib/queries/instruments';
import { useMembersList } from '../../lib/queries/members';
import {
  useAppendSetlistEntry,
  useDeleteSetlistEntry,
  useReorderSetlist,
  useSetlistEntries,
  useUpdateSetlistEntry,
} from '../../lib/queries/setlists';
import { useSongsList } from '../../lib/queries/songs';
import { SetlistEntriesList } from './SetlistEntriesList';
import { SetlistSongPicker } from './SetlistSongPicker';
import { formatSetlistOrder, instrumentHarmonicMap, lineupOf } from './setlist-editor.utils';
import { filterEntriesForMember } from './setlist-filter.core';
import { TransitionCommentModal } from './TransitionCommentModal';
import { WarnMarkerGutter } from './WarnMarkerGutter';

interface SetlistEditorProps {
  readonly setlistId: string;
}

const ENERGY_SPARKLINE_HEIGHT_PX = 160;
const COPIED_FEEDBACK_MS = 2000;

export function SetlistEditor({ setlistId }: SetlistEditorProps): JSX.Element {
  const { t } = useTranslation();
  const entriesQuery = useSetlistEntries(setlistId);
  const songsQuery = useSongsList();
  const instrumentsQuery = useInstrumentsList();
  const membersQuery = useMembersList();
  const append = useAppendSetlistEntry();
  const updateEntry = useUpdateSetlistEntry();
  const removeEntry = useDeleteSetlistEntry();
  const reorder = useReorderSetlist();

  const [transitionEditing, setTransitionEditing] = useState<{
    songAId: string;
    songBId: string;
  } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [orderCopied, setOrderCopied] = useState(false);

  const entries = entriesQuery.data?.entries ?? [];
  const songs = songsQuery.data?.songs ?? [];
  const instruments = instrumentsQuery.data?.instruments ?? [];
  const members = membersQuery.data?.members ?? [];

  const songsById = useMemo(() => {
    const out: Record<string, (typeof songs)[number]> = {};
    for (const song of songs) out[song.id] = song;
    return out;
  }, [songs]);

  const instrumentHarmonic = useMemo(() => instrumentHarmonicMap(instruments), [instruments]);

  const lineupMembers = useMemo(
    () => members.map((member) => ({ id: member.id, name: member.firstName, color: member.color })),
    [members],
  );

  const energyValues = useMemo(
    () => entries.map((entry) => entry.energy ?? songsById[entry.songId]?.baseEnergy ?? null),
    [entries, songsById],
  );

  const transitions = useMemo(() => {
    const out: ('safe' | 'warn')[] = [];
    for (let index = 0; index < entries.length - 1; index += 1) {
      const left = entries[index];
      const right = entries[index + 1];
      if (left === undefined || right === undefined) continue;
      const verdict = evaluateTransition(
        lineupOf(left, songsById),
        lineupOf(right, songsById),
        instrumentHarmonic,
      );
      out.push(verdict.kind);
    }
    return out;
  }, [entries, songsById, instrumentHarmonic]);

  const filtered = useMemo(
    () => filterEntriesForMember(entries, songsById, selectedMemberId),
    [entries, songsById, selectedMemberId],
  );
  const instrumentsById = useMemo(() => {
    const out: Record<string, (typeof instruments)[number]> = {};
    for (const instrument of instruments) out[instrument.id] = instrument;
    return out;
  }, [instruments]);
  const membersById = useMemo(() => {
    const out: Record<string, (typeof members)[number]> = {};
    for (const member of members) out[member.id] = member;
    return out;
  }, [members]);
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

  const handleRemove = (entryId: string): void => {
    removeEntry.mutate({ setlistId, entryId }, { onError: recordError });
  };

  const handleReorder = (orderedEntryIds: readonly string[]): void => {
    reorder.mutate({ setlistId, entryIds: [...orderedEntryIds] }, { onError: recordError });
  };

  const handleUpdate = (entryId: string, patch: Record<string, unknown>): void => {
    updateEntry.mutate({ setlistId, entryId, ...patch }, { onError: recordError });
  };

  const handleCopyOrder = async (): Promise<void> => {
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

  const inFilteredMode = selectedMemberId !== null;
  const visibleEntries = filtered.visibleEntries;

  return (
    <div className="flex flex-col gap-4">
      {displayError !== null ? (
        <p className="text-danger text-sm" role="alert">
          {displayError}
        </p>
      ) : null}
      <MemberFilterPills
        members={lineupMembers}
        selectedMemberId={selectedMemberId}
        onChange={setSelectedMemberId}
        className="sticky top-0 z-10 bg-bg -mx-4 sm:-mx-9 px-4 sm:px-9"
      />
      <div className="bg-bg-elev border border-line rounded-lg p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-400">
            {t('setlist.energy')}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleCopyOrder()}
            disabled={entries.length === 0}
          >
            <Icon name={orderCopied ? 'check' : 'text'} size={14} />
            {orderCopied ? t('setlist.orderCopied') : t('setlist.copyOrder')}
          </Button>
        </div>
        <EnergySparkline values={energyValues} height={ENERGY_SPARKLINE_HEIGHT_PX} />
      </div>
      {inFilteredMode && visibleEntries.length === 0 ? (
        <p className="text-ink-500 italic text-sm py-6 text-center">{t('lineup.emptyForMember')}</p>
      ) : (
        <div className="relative">
          {!inFilteredMode ? (
            <WarnMarkerGutter
              transitions={transitions}
              entries={entries}
              onOpenTransition={(songAId, songBId) => setTransitionEditing({ songAId, songBId })}
            />
          ) : null}
          <SetlistEntriesList
            entries={entries}
            visibleEntries={visibleEntries}
            songsById={songsById}
            transitions={transitions}
            inFilteredMode={inFilteredMode}
            selectedMemberId={selectedMemberId}
            filteredInstrumentByEntryId={filtered.instrumentByEntryId}
            lineupMembers={lineupMembers}
            instruments={instruments}
            membersById={membersById}
            instrumentsById={instrumentsById}
            knownMemberIds={knownMemberIds}
            onReorder={handleReorder}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            onOpenTransition={(songAId, songBId) => setTransitionEditing({ songAId, songBId })}
          />
        </div>
      )}
      <SetlistSongPicker songs={songs} onPick={addEntry} />
      {transitionEditing !== null ? (
        <TransitionCommentModal
          songAId={transitionEditing.songAId}
          songBId={transitionEditing.songBId}
          onClose={() => setTransitionEditing(null)}
        />
      ) : null}
    </div>
  );
}
