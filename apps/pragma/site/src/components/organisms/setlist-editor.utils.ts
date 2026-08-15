/**
 * Pure helpers for the SetlistEditor. Extracted so the parent stays
 * under the file-length cap and so the lineup / tonality / instrument
 * derivations stay easy to cover at 100%.
 */

import type { InstrumentFamily } from '@domain/instrument.core';
import { type Lineup, resolveLineup } from '@domain/lineup.core';

export interface SetlistEditorSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly tonalityStart?: string | null;
  readonly tonalityEnd?: string | null;
  readonly defaultLineup: Lineup;
}

export interface SetlistEditorInstrument {
  readonly id: string;
  readonly name: string;
  readonly family: InstrumentFamily;
}

export interface SetlistEditorEntry {
  readonly songId: string;
  readonly lineupOverride: Lineup | null;
}

export function tonalityLabelFor(song: SetlistEditorSong | undefined): string | null {
  if (song === undefined) return null;
  const start = song.tonalityStart ?? null;
  const end = song.tonalityEnd ?? null;
  if (start === null) return null;
  if (end !== null && end !== start) return `${start} → ${end}`;
  return start;
}

export interface ClipboardSetlistEntry {
  readonly songId: string;
  readonly keyOverride: string | null;
}

/**
 * Renders the ordered setlist as plain text for the clipboard, one
 * numbered line per entry: `1. Title — Artist (Key)`. The key is the
 * entry's `keyOverride` when set, otherwise the song's tonality label;
 * it is omitted when neither is available. A missing song id yields a
 * `?` placeholder so the position numbering stays aligned.
 */
// @FollowsBlueprint utils-pure-module
export function formatSetlistOrder(
  entries: readonly ClipboardSetlistEntry[],
  songsById: Readonly<Record<string, SetlistEditorSong>>,
): string {
  return entries
    .map((entry, index) => {
      const position = index + 1;
      const song = songsById[entry.songId];
      if (song === undefined) return `${position}. ?`;
      const key = entry.keyOverride ?? tonalityLabelFor(song);
      const keySuffix = key !== null && key !== '' ? ` (${key})` : '';
      return `${position}. ${song.title} — ${song.artist}${keySuffix}`;
    })
    .join('\n');
}

export function instrumentFamilyMap(
  instruments: readonly SetlistEditorInstrument[],
): Record<string, { family: InstrumentFamily }> {
  const out: Record<string, { family: InstrumentFamily }> = {};
  for (const row of instruments) out[row.id] = { family: row.family };
  return out;
}

export function lineupOf(
  entry: SetlistEditorEntry,
  songsById: Readonly<Record<string, SetlistEditorSong>>,
): Lineup {
  const song = songsById[entry.songId];
  return resolveLineup(song?.defaultLineup ?? {}, entry.lineupOverride);
}

/** The lineup without the members sitting the song out, which is what a chip row draws. */
export function compactLineup(lineup: Lineup): Record<string, readonly string[]> {
  const result: Record<string, readonly string[]> = {};
  for (const [memberId, instrumentIds] of Object.entries(lineup)) {
    if (instrumentIds.length > 0) result[memberId] = instrumentIds;
  }
  return result;
}

export interface ProminentMemberInstrumentResolution {
  readonly memberName: string;
  readonly memberColor: string;
  readonly instrumentNames: readonly string[];
}

interface NameableMember {
  readonly firstName: string;
  readonly color: string;
}

interface NameableInstrument {
  readonly name: string;
}

/**
 * Returns member ids that appear in a resolved lineup but are not in
 * the supplied set of known member ids — the symptom of a missed
 * cascade-scrub (R1 in the lineup-editor plan). Pure so the caller
 * owns when and how to surface the warning.
 */
export function findOrphanMemberIds(lineup: Lineup, knownMemberIds: ReadonlySet<string>): string[] {
  const orphans: string[] = [];
  for (const memberId of Object.keys(lineup)) {
    if (!knownMemberIds.has(memberId)) orphans.push(memberId);
  }
  return orphans;
}

/**
 * The orphans nobody has been told about yet, so the caller loops over a list
 * rather than deciding per entry whether it has already complained.
 */
export function selectUnwarnedMemberIds(
  orphanMemberIds: readonly string[],
  warnedMemberIds: ReadonlySet<string>,
): string[] {
  return orphanMemberIds.filter((memberId) => !warnedMemberIds.has(memberId));
}

export function prominentMemberInstrumentFor(
  instrumentIds: readonly string[] | undefined,
  selectedMemberId: string | null,
  membersById: Readonly<Record<string, NameableMember>>,
  instrumentsById: Readonly<Record<string, NameableInstrument>>,
): ProminentMemberInstrumentResolution | null {
  if (instrumentIds === undefined) return null;
  if (selectedMemberId === null) return null;
  const member = membersById[selectedMemberId];
  if (member === undefined) return null;
  const instrumentNames = instrumentIds.flatMap((instrumentId) => {
    const instrument = instrumentsById[instrumentId];
    return instrument === undefined ? [] : [instrument.name];
  });
  if (instrumentNames.length === 0) return null;
  return {
    memberName: member.firstName,
    memberColor: member.color,
    instrumentNames,
  };
}

/** The instrument names a lineup gives one member, for a chip's tooltip. */
export function instrumentNamesFor(
  instrumentIds: readonly string[],
  instrumentsById: Readonly<Record<string, NameableInstrument>>,
): string[] {
  return instrumentIds.flatMap((instrumentId) => {
    const instrument = instrumentsById[instrumentId];
    return instrument === undefined ? [] : [instrument.name];
  });
}
