/** @Feature setlists */

import type { InstrumentIcon } from '@domain/instrument.core';
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

export interface PartInstrument {
  readonly id: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
}

export interface MemberPart {
  readonly instrumentId: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
  readonly isNameNeeded: boolean;
}

function selectSharedIcons(instruments: readonly PartInstrument[]): ReadonlySet<InstrumentIcon> {
  const seen = new Set<InstrumentIcon>();
  const shared = new Set<InstrumentIcon>();
  for (const instrument of instruments) {
    if (seen.has(instrument.icon)) shared.add(instrument.icon);
    seen.add(instrument.icon);
  }
  return shared;
}

export function describeMemberPartsByEntryId(
  instrumentIdsByEntryId: Readonly<Record<string, readonly string[]>>,
  instruments: readonly PartInstrument[],
): Readonly<Record<string, readonly MemberPart[]>> {
  const instrumentsById = new Map(instruments.map((instrument) => [instrument.id, instrument]));
  const sharedIcons = selectSharedIcons(instruments);
  const partsByEntryId: Record<string, readonly MemberPart[]> = {};
  for (const [entryId, instrumentIds] of Object.entries(instrumentIdsByEntryId)) {
    partsByEntryId[entryId] = instrumentIds.flatMap((instrumentId) => {
      const instrument = instrumentsById.get(instrumentId);
      if (instrument === undefined) return [];
      return [
        {
          instrumentId,
          name: instrument.name,
          icon: instrument.icon,
          isNameNeeded: sharedIcons.has(instrument.icon),
        },
      ];
    });
  }
  return partsByEntryId;
}
