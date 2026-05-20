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
