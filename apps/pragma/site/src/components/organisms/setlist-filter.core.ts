/** @Feature setlists */

import { instrumentsHeldBy, resolveLineup } from '@domain/lineup.core';
import type { SetlistEditorEntry, SetlistEditorSong } from './setlist-editor.utils';

export interface FilterableEntry extends SetlistEditorEntry {
  readonly id: string;
}

export interface FilterEntriesResult<TEntry extends FilterableEntry> {
  readonly visibleEntries: readonly TEntry[];
  readonly instrumentIdsByEntryId: Readonly<Record<string, readonly string[]>>;
}

// @FollowsBlueprint core-view-projection
export function filterEntriesForMember<TEntry extends FilterableEntry>(
  entries: readonly TEntry[],
  songsById: Readonly<Record<string, SetlistEditorSong>>,
  selectedMemberId: string | null,
): FilterEntriesResult<TEntry> {
  if (selectedMemberId === null) {
    return { visibleEntries: entries, instrumentIdsByEntryId: {} };
  }
  const visibleEntries: TEntry[] = [];
  const instrumentIdsByEntryId: Record<string, readonly string[]> = {};
  for (const entry of entries) {
    const instrumentIds = resolveInstrumentsForMember(entry, songsById, selectedMemberId);
    if (instrumentIds.length === 0) continue;
    visibleEntries.push(entry);
    instrumentIdsByEntryId[entry.id] = instrumentIds;
  }
  return { visibleEntries, instrumentIdsByEntryId };
}

function resolveInstrumentsForMember(
  entry: SetlistEditorEntry,
  songsById: Readonly<Record<string, SetlistEditorSong>>,
  memberId: string,
): readonly string[] {
  const song = songsById[entry.songId];
  if (song === undefined) return [];
  return instrumentsHeldBy(resolveLineup(song.defaultLineup, entry.lineupOverride), memberId);
}
