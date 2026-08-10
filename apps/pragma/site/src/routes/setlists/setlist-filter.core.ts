/**
 * Per-member filter for the setlist editor. Given the entries, the
 * per-song defaults, and a `selectedMemberId`, returns the visible
 * subset of entries plus the instrument id each entry assigns to the
 * selected member.
 *
 * `selectedMemberId === null` is the "all members" pass-through: every
 * entry is visible and no per-entry instrument chip is produced.
 *
 * Resolution rule mirrors the BE `resolveLineup` helper — the override
 * wins per key over the song default; an absent key falls back to the
 * default's value for that key.
 */

import type { SetlistEditorEntry, SetlistEditorSong } from './setlist-editor.utils';

export interface FilterableEntry extends SetlistEditorEntry {
  readonly id: string;
}

export interface FilterEntriesResult<TEntry extends FilterableEntry> {
  readonly visibleEntries: readonly TEntry[];
  readonly instrumentByEntryId: Readonly<Record<string, string>>;
}

export function filterEntriesForMember<TEntry extends FilterableEntry>(
  entries: readonly TEntry[],
  songsById: Readonly<Record<string, SetlistEditorSong>>,
  selectedMemberId: string | null,
): FilterEntriesResult<TEntry> {
  if (selectedMemberId === null) {
    return { visibleEntries: entries, instrumentByEntryId: {} };
  }
  const visibleEntries: TEntry[] = [];
  const instrumentByEntryId: Record<string, string> = {};
  for (const entry of entries) {
    const instrumentId = resolveInstrumentForMember(entry, songsById, selectedMemberId);
    if (instrumentId === null) continue;
    visibleEntries.push(entry);
    instrumentByEntryId[entry.id] = instrumentId;
  }
  return { visibleEntries, instrumentByEntryId };
}

function resolveInstrumentForMember(
  entry: SetlistEditorEntry,
  songsById: Readonly<Record<string, SetlistEditorSong>>,
  memberId: string,
): string | null {
  if (entry.lineupOverride !== null && memberId in entry.lineupOverride) {
    return entry.lineupOverride[memberId] ?? null;
  }
  const song = songsById[entry.songId];
  if (song === undefined) return null;
  return song.defaultLineup[memberId] ?? null;
}
