/**
 * Setlist editor. Embedded inside the concert session detail page.
 * Renders the ordered entries; each row carries an inline display
 * (title, artist, tonality, mastery, lineup, energy slider). The
 * energy sparkline sits ABOVE the list, derived from the per-entry
 * energy values.
 *
 * Reordering uses HTML5 drag-from-handle. Transition warnings are
 * computed by `transition.core.ts` between each consecutive pair; a
 * warned pair carries a circular orange marker in the side gutter,
 * which opens the TransitionCommentModal.
 */

import { evaluateTransition } from '@api/setlists/transition.core';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnergySparkline } from '../../components/molecules/EnergySparkline';
import { Icon } from '../../components/atoms/Icon';
import { ApiError } from '../../lib/api';
import { useInstrumentsList } from '../../lib/queries/instruments';
import { useMembersList } from '../../lib/queries/members';
import { useSongsList } from '../../lib/queries/songs';
import {
  useAppendSetlistEntry,
  useDeleteSetlistEntry,
  useReorderSetlist,
  useSetlistEntries,
  useUpdateSetlistEntry,
} from '../../lib/queries/setlists';
import { SetlistEntryRow } from './SetlistEntryRow';
import { TransitionCommentModal } from './TransitionCommentModal';
import {
  compactLineup,
  instrumentHarmonicMap,
  lineupOf,
  tonalityLabelFor,
} from './setlist-editor.utils';

interface SetlistEditorProps {
  readonly setlistId: string;
}

const ROW_HEIGHT_PX = 84;
const ROW_GAP_PX = 8;
const WARN_MARKER_OFFSET_PX = 12;

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

  const [transitionEditing, setTransitionEditing] = useState<
    { songAId: string; songBId: string } | null
  >(null);
  const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

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
    () =>
      members.map((member) => ({ id: member.id, name: member.firstName, color: member.color })),
    [members],
  );

  const energyValues = useMemo(() => entries.map((entry) => entry.energy), [entries]);

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

  const recordError = (error: Error): void =>
    setLocalError(error instanceof ApiError ? error.message : 'unknown-error');

  const addEntry = (songId: string): void => {
    append.mutate(
      { setlistId, songId, optimisticId: crypto.randomUUID() },
      { onError: recordError },
    );
  };

  const handleRemove = (entryId: string): void => {
    removeEntry.mutate({ setlistId, entryId }, { onError: recordError });
  };

  const dropOnEntry = (targetEntryId: string): void => {
    const draggedId = draggingEntryId;
    setDraggingEntryId(null);
    if (draggedId === null || draggedId === targetEntryId) return;
    const ordered = entries.map((entry) => entry.id);
    const fromIndex = ordered.indexOf(draggedId);
    const toIndex = ordered.indexOf(targetEntryId);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...ordered];
    const moved = next.splice(fromIndex, 1)[0];
    if (moved === undefined) return;
    next.splice(toIndex, 0, moved);
    reorder.mutate({ setlistId, entryIds: next }, { onError: recordError });
  };

  const handleUpdate = (entryId: string, patch: Record<string, unknown>): void => {
    updateEntry.mutate({ setlistId, entryId, ...patch }, { onError: recordError });
  };

  if (entriesQuery.isLoading) {
    return <p className="text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }

  const queryError =
    entriesQuery.error instanceof ApiError ? entriesQuery.error.message : null;
  const displayError = localError ?? queryError;

  return (
    <div className="flex flex-col gap-4">
      {displayError !== null ? (
        <p className="text-danger text-sm" role="alert">
          {displayError}
        </p>
      ) : null}
      <div className="bg-bg-elev border border-line rounded-lg p-4">
        <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-400 mb-2">
          {t('setlist.energy')}
        </div>
        <EnergySparkline values={energyValues} height={80} />
      </div>
      <div className="relative">
        <div
          className="absolute -left-6 top-0 bottom-0 w-5 pointer-events-none lg:block hidden"
          aria-hidden="true"
        >
          {transitions.map((kind, gapIndex) => {
            if (kind !== 'warn') return null;
            const leftEntry = entries[gapIndex];
            const rightEntry = entries[gapIndex + 1];
            if (leftEntry === undefined || rightEntry === undefined) return null;
            const offsetPx = (gapIndex + 1) * (ROW_HEIGHT_PX + ROW_GAP_PX) - WARN_MARKER_OFFSET_PX;
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: warnings are tied to a stable entry pair, the gap index is the natural key
                key={`gap-${gapIndex}`}
                type="button"
                className="pointer-events-auto absolute left-0 w-5 h-5 rounded-full bg-warn text-bg-elev font-bold text-[11px] inline-flex items-center justify-center cursor-pointer border-0 shadow-[0_2px_6px_rgba(184,132,26,0.4)] hover:opacity-90"
                style={{ top: offsetPx }}
                aria-label={t('setlist.openTransitionComment')}
                onClick={() =>
                  setTransitionEditing({
                    songAId: leftEntry.songId,
                    songBId: rightEntry.songId,
                  })
                }
              >
                <Icon name="warn" size={12} />
              </button>
            );
          })}
        </div>
        <ul className="flex flex-col gap-2">
          {entries.map((entry, index) => {
            const song = songsById[entry.songId];
            const lineupRaw = lineupOf(entry, songsById);
            const previousKind = transitions[index - 1];
            return (
              <li key={entry.id} className="flex flex-col gap-1">
                {previousKind === 'warn' ? (
                  <button
                    type="button"
                    className="lg:hidden inline-flex items-center gap-1.5 text-[11px] font-medium text-warn bg-warn-soft self-start px-2 py-1 rounded-md cursor-pointer border-0"
                    aria-label={t('setlist.openTransitionComment')}
                    onClick={() => {
                      const leftEntry = entries[index - 1];
                      if (leftEntry === undefined) return;
                      setTransitionEditing({
                        songAId: leftEntry.songId,
                        songBId: entry.songId,
                      });
                    }}
                  >
                    <Icon name="warn" size={12} />
                    {t('setlist.transitionWarning')}
                  </button>
                ) : null}
                <SetlistEntryRow
                  position={index + 1}
                  entryId={entry.id}
                  title={song?.title ?? entry.songId.slice(0, 8)}
                  artist={song?.artist ?? ''}
                  tonalityLabel={tonalityLabelFor(song)}
                  meanMastery={null}
                  keyOverride={entry.keyOverride}
                  capo={entry.capo}
                  energy={entry.energy}
                  notes={entry.notes}
                  currentSongId={entry.songId}
                  lineup={compactLineup(lineupRaw)}
                  members={lineupMembers}
                  instruments={instruments}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                  onDragStart={(id) => setDraggingEntryId(id)}
                  onDropOn={dropOnEntry}
                />
              </li>
            );
          })}
        </ul>
      </div>
      <details className="bg-bg-sunk border border-line rounded-md p-3">
        <summary className="cursor-pointer text-sm text-ink-700 font-medium">
          {t('setlist.addSong')}
        </summary>
        <ul className="flex flex-col gap-1 mt-3">
          {songs
            .toSorted((left, right) => left.title.localeCompare(right.title))
            .map((song) => (
              <li key={song.id}>
                <button
                  type="button"
                  onClick={() => addEntry(song.id)}
                  className="w-full text-left bg-transparent border-0 text-[13px] text-ink-700 hover:bg-bg-elev px-2 py-1 rounded-md cursor-pointer transition-colors"
                >
                  + {song.title}
                </button>
              </li>
            ))}
        </ul>
      </details>
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
