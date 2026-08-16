/**
 * Per-member filter for the setlist editor. Given the entries, the
 * per-song defaults, and a `selectedMemberId`, returns the visible
 * subset of entries plus the instrument id each entry assigns to the
 * selected member.
 *
 * `selectedMemberId === null` is the "all members" pass-through: every
 * entry is visible and no per-entry instrument chip is produced. A member
 * holding two instruments on one song answers with both.
 *
 * The resolution rule itself is `resolveLineup` in `domain/`, shared with the
 * back end, so the override winning per key over the song default is decided
 * in one place rather than written out again here.
 * @Feature setlists
 */

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
