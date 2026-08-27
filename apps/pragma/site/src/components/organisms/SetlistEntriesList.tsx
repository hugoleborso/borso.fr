/** @Feature setlists */

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { JSX } from 'react';
import { useState } from 'react';
import type { LineupEditorInstrument } from '../molecules/LineupEditor';
import type { LineupMember } from '../molecules/MemberLineup';
import { warnIfOrphanMemberIds } from './orphan-member-warn.adapter';
import { SetlistEntryDragPreview } from '../molecules/SetlistEntryDragPreview';
import { SetlistEntryRow } from './SetlistEntryRow';
import {
  compactLineup,
  lineupOf,
  prominentMemberInstrumentFor,
  restrictToVerticalAxis,
  type SetlistEditorEntry,
  type SetlistEditorSong,
  tonalityLabelFor,
} from './setlist-editor.utils';
import type { SongDefaults, SongDefaultsPatch } from '../molecules/SongDefaultsDialog';
import { TransitionStrip } from './TransitionStrip';
import { type TransitionView, transitionPairKey } from './transition-view.core';
import type { SetlistEntryPatch } from '../../lib/queries/setlist-entries.queries';

const DRAG_MODIFIERS = [restrictToVerticalAxis];
const STATUS_OF_A_SONG_THE_CATALOG_LOST = 'idea';
const SONG_ID_FALLBACK_LENGTH = 8;
const DRAG_ACTIVATION_DISTANCE_PX = 6;
const DRAG_TOUCH_DELAY_MS = 200;
const DRAG_TOUCH_TOLERANCE_PX = 8;

interface ListEntry extends SetlistEditorEntry {
  readonly id: string;
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly energy: number | null;
  readonly notes: string;
}

export interface SetlistEntriesListProps {
  readonly entries: readonly ListEntry[];
  readonly visibleEntries: readonly ListEntry[];
  readonly songsById: Readonly<Record<string, SetlistEditorSong>>;
  readonly transitionViews: readonly TransitionView[];
  readonly transitionNotesByPair: Readonly<Record<string, string>>;
  readonly meanMasteryBySongId: Readonly<Record<string, number | null>>;
  readonly inFilteredMode: boolean;
  readonly selectedMemberId: string | null;
  readonly filteredInstrumentIdsByEntryId: Readonly<Record<string, readonly string[] | undefined>>;
  readonly lineupMembers: readonly LineupMember[];
  readonly instruments: readonly LineupEditorInstrument[];
  readonly membersById: Readonly<Record<string, { firstName: string; color: string }>>;
  readonly instrumentsById: Readonly<Record<string, { name: string }>>;
  readonly knownMemberIds: ReadonlySet<string>;
  readonly maximumVisibleMembers: number;
  readonly onReorder: (orderedEntryIds: readonly string[]) => void;
  readonly onUpdate: (entryId: string, patch: SetlistEntryPatch) => void;
  readonly onUpdateSongDefaults: (songId: string, patch: SongDefaultsPatch) => void;
  readonly onRemove: (entryId: string) => void;
  readonly onOpenTransition: (leftSongId: string, rightSongId: string) => void;
}

function songDefaultsOf(song: SetlistEditorSong | undefined): SongDefaults {
  return {
    status: song?.status ?? STATUS_OF_A_SONG_THE_CATALOG_LOST,
    tonalityStart: song?.tonalityStart ?? null,
    tonalityEnd: song?.tonalityEnd ?? null,
    baseEnergy: song?.baseEnergy ?? null,
  };
}

export function SetlistEntriesList(props: SetlistEntriesListProps): JSX.Element {
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: DRAG_TOUCH_DELAY_MS, tolerance: DRAG_TOUCH_TOLERANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commitDragReorder = (event: DragEndEvent): void => {
    setActiveEntryId(null);
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const ordered = props.entries.map((entry) => entry.id);
    const fromIndex = ordered.indexOf(String(active.id));
    const toIndex = ordered.indexOf(String(over.id));
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...ordered];
    const [moved] = next.splice(fromIndex, 1);
    if (moved === undefined) return;
    next.splice(toIndex, 0, moved);
    props.onReorder(next);
  };

  const renderTransitionBefore = (fullIndex: number): JSX.Element | null => {
    if (props.inFilteredMode) return null;
    const view = props.transitionViews[fullIndex - 1];
    const leftEntry = props.entries[fullIndex - 1];
    const rightEntry = props.entries[fullIndex];
    if (view === undefined || leftEntry === undefined || rightEntry === undefined) return null;
    return (
      <TransitionStrip
        view={view}
        note={
          props.transitionNotesByPair[transitionPairKey(leftEntry.songId, rightEntry.songId)] ?? ''
        }
        onOpenNote={() => props.onOpenTransition(leftEntry.songId, rightEntry.songId)}
      />
    );
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={DRAG_MODIFIERS}
      collisionDetection={closestCenter}
      onDragStart={(event: DragStartEvent) => setActiveEntryId(String(event.active.id))}
      onDragEnd={commitDragReorder}
      onDragCancel={() => setActiveEntryId(null)}
    >
      <SortableContext
        items={props.visibleEntries.map((entry) => entry.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {props.visibleEntries.map((entry, visibleIndex) => {
            const song = props.songsById[entry.songId];
            const lineupRaw = lineupOf(entry, props.songsById);
            warnIfOrphanMemberIds(lineupRaw, props.knownMemberIds, entry.songId);
            const fullIndex = props.entries.indexOf(entry);
            const prominent = prominentMemberInstrumentFor({
              instrumentIds: props.filteredInstrumentIdsByEntryId[entry.id],
              selectedMemberId: props.selectedMemberId,
              membersById: props.membersById,
              instrumentsById: props.instrumentsById,
            });
            return (
              <SetlistEntryRow
                key={entry.id}
                position={props.inFilteredMode ? visibleIndex + 1 : fullIndex + 1}
                entryId={entry.id}
                title={song?.title ?? entry.songId.slice(0, SONG_ID_FALLBACK_LENGTH)}
                artist={song?.artist ?? ''}
                tonalityLabel={tonalityLabelFor(song)}
                meanMastery={props.meanMasteryBySongId[entry.songId] ?? null}
                keyOverride={entry.keyOverride}
                capo={entry.capo}
                energy={entry.energy}
                baseEnergy={song?.baseEnergy ?? null}
                notes={entry.notes}
                lineup={compactLineup(lineupRaw)}
                resolvedLineupForEdit={lineupRaw}
                songDefaultLineup={song?.defaultLineup ?? {}}
                songDefaults={songDefaultsOf(song)}
                maximumVisibleMembers={props.maximumVisibleMembers}
                hasOverride={entry.lineupOverride !== null}
                members={props.lineupMembers}
                instruments={props.instruments}
                prominentMemberInstrument={prominent}
                transitionBefore={renderTransitionBefore(fullIndex)}
                onUpdate={props.onUpdate}
                onUpdateSongDefaults={(patch) => props.onUpdateSongDefaults(entry.songId, patch)}
                onRemove={props.onRemove}
              />
            );
          })}
        </ul>
      </SortableContext>
      <DragOverlay dropAnimation={null} modifiers={DRAG_MODIFIERS}>
        {activeEntryId === null ? null : renderDragPreview(props, activeEntryId)}
      </DragOverlay>
    </DndContext>
  );
}

function renderDragPreview(
  props: SetlistEntriesListProps,
  activeEntryId: string,
): JSX.Element | null {
  const activeIndex = props.entries.findIndex((entry) => entry.id === activeEntryId);
  if (activeIndex === -1) return null;
  const activeEntry = props.entries[activeIndex];
  if (activeEntry === undefined) return null;
  const activeSong = props.songsById[activeEntry.songId];
  return (
    <SetlistEntryDragPreview
      position={activeIndex + 1}
      title={activeSong?.title ?? activeEntry.songId.slice(0, SONG_ID_FALLBACK_LENGTH)}
      artist={activeSong?.artist ?? ''}
    />
  );
}
