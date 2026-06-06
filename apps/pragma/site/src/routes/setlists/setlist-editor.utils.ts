/**
 * Pure helpers for the SetlistEditor. Extracted so the parent stays
 * under the file-length cap and so the lineup / tonality / mastery
 * derivations stay easy to cover at 100%.
 */

export interface SetlistEditorSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly tonalityStart?: string | null;
  readonly tonalityEnd?: string | null;
  readonly defaultLineup: Readonly<Record<string, string | null>>;
}

export interface SetlistEditorInstrument {
  readonly id: string;
  readonly name: string;
  readonly isHarmonic: boolean;
}

export interface SetlistEditorEntry {
  readonly songId: string;
  readonly lineupOverride: Readonly<Record<string, string | null>> | null;
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

export function instrumentHarmonicMap(
  instruments: readonly SetlistEditorInstrument[],
): Record<string, { isHarmonic: boolean }> {
  const out: Record<string, { isHarmonic: boolean }> = {};
  for (const row of instruments) out[row.id] = { isHarmonic: row.isHarmonic };
  return out;
}

export function lineupOf(
  entry: SetlistEditorEntry,
  songsById: Readonly<Record<string, SetlistEditorSong>>,
): Record<string, string | null> {
  if (entry.lineupOverride !== null) return { ...entry.lineupOverride };
  const song = songsById[entry.songId];
  if (song === undefined) return {};
  return { ...song.defaultLineup };
}

export function compactLineup(
  lineup: Readonly<Record<string, string | null>>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [memberId, instrumentId] of Object.entries(lineup)) {
    if (instrumentId !== null && instrumentId !== '') {
      result[memberId] = instrumentId;
    }
  }
  return result;
}

export interface ProminentMemberInstrumentResolution {
  readonly memberName: string;
  readonly memberColor: string;
  readonly instrumentName: string;
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
export function findOrphanMemberIds(
  lineup: Readonly<Record<string, string | null>>,
  knownMemberIds: ReadonlySet<string>,
): string[] {
  const orphans: string[] = [];
  for (const memberId of Object.keys(lineup)) {
    if (!knownMemberIds.has(memberId)) orphans.push(memberId);
  }
  return orphans;
}

export function prominentMemberInstrumentFor(
  instrumentId: string | undefined,
  selectedMemberId: string | null,
  membersById: Readonly<Record<string, NameableMember>>,
  instrumentsById: Readonly<Record<string, NameableInstrument>>,
): ProminentMemberInstrumentResolution | null {
  if (instrumentId === undefined || selectedMemberId === null) return null;
  const member = membersById[selectedMemberId];
  const instrument = instrumentsById[instrumentId];
  if (member === undefined || instrument === undefined) return null;
  return {
    memberName: member.firstName,
    memberColor: member.color,
    instrumentName: instrument.name,
  };
}
