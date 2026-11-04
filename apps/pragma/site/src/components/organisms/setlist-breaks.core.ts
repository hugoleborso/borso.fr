/** @Feature setlists */

import type { OrderRow } from './SetlistOrderList';

export interface PlacedBreak {
  readonly id: string;
  readonly label: string;
  readonly position: number;
  readonly songsBefore: number;
}

export type SetlistLine<TEntry, TBreak extends PlacedBreak> =
  | { readonly kind: 'song'; readonly entry: TEntry; readonly songIndex: number }
  | { readonly kind: 'break'; readonly setlistBreak: TBreak };

// @FollowsBlueprint core-projection
export function groupBreaksBySongsBefore<TBreak extends PlacedBreak>(
  breaks: readonly TBreak[],
): ReadonlyMap<number, readonly TBreak[]> {
  const grouped = new Map<number, TBreak[]>();
  const inOrder = breaks.toSorted((left, right) => left.position - right.position);
  for (const setlistBreak of inOrder) {
    const group = grouped.get(setlistBreak.songsBefore) ?? [];
    group.push(setlistBreak);
    grouped.set(setlistBreak.songsBefore, group);
  }
  return grouped;
}

export function interleaveBreaks<TEntry, TBreak extends PlacedBreak>(
  entries: readonly TEntry[],
  breaks: readonly TBreak[],
): SetlistLine<TEntry, TBreak>[] {
  const grouped = groupBreaksBySongsBefore(breaks);
  const breakLines = (songsBefore: number): SetlistLine<TEntry, TBreak>[] =>
    (grouped.get(songsBefore) ?? []).map((setlistBreak) => ({ kind: 'break', setlistBreak }));
  const lines = entries.flatMap((entry, songIndex): SetlistLine<TEntry, TBreak>[] => [
    ...breakLines(songIndex),
    { kind: 'song', entry, songIndex },
  ]);
  const trailing = [...grouped.keys()]
    .filter((songsBefore) => songsBefore >= entries.length)
    .flatMap(breakLines);
  return [...lines, ...trailing];
}

export function recountSongsBefore<TBreak extends PlacedBreak>(
  breaks: readonly TBreak[],
  orderedIds: readonly string[],
): TBreak[] {
  const breakIds = new Set(breaks.map((setlistBreak) => setlistBreak.id));
  const placement = new Map<string, { songsBefore: number; position: number }>();
  let songCount = 0;
  for (const [position, id] of orderedIds.entries()) {
    if (breakIds.has(id)) placement.set(id, { songsBefore: songCount, position });
    else songCount += 1;
  }
  return breaks.map((setlistBreak) => ({
    ...setlistBreak,
    ...placement.get(setlistBreak.id),
  }));
}

export function withdrawSongFromBreaks<TBreak extends PlacedBreak>(
  breaks: readonly TBreak[],
  songIndex: number,
): TBreak[] {
  return breaks.map((setlistBreak) =>
    setlistBreak.songsBefore > songIndex
      ? { ...setlistBreak, songsBefore: setlistBreak.songsBefore - 1 }
      : setlistBreak,
  );
}

export function selectBreakTitle(label: string, unnamedTitle: string): string {
  return label === '' ? unnamedTitle : label;
}

export function selectChangedLabel(draft: string, savedLabel: string): string | null {
  const trimmed = draft.trim();
  return trimmed === savedLabel ? null : trimmed;
}

export function isSubmitKey(key: string): boolean {
  return key === 'Enter';
}

export function isBreakLine(line: { readonly kind: 'song' | 'break' }): boolean {
  return line.kind === 'break';
}

const SONG_ID_FALLBACK_LENGTH = 8;

interface OrderEntry {
  readonly id: string;
  readonly songId: string;
  readonly energy: number | null;
}

interface OrderSong {
  readonly title: string;
  readonly durationSeconds?: number | null;
  readonly baseEnergy?: number | null;
}

export function toOrderRows(
  lines: readonly SetlistLine<OrderEntry, PlacedBreak>[],
  songsById: Readonly<Record<string, OrderSong | undefined>>,
  unnamedBreakTitle: string,
): OrderRow[] {
  return lines.map((line): OrderRow => {
    if (line.kind === 'break') {
      return {
        id: line.setlistBreak.id,
        kind: 'break',
        title: selectBreakTitle(line.setlistBreak.label, unnamedBreakTitle),
        durationSeconds: null,
        entryEnergy: null,
        songEnergy: null,
      };
    }
    const song = songsById[line.entry.songId];
    return {
      id: line.entry.id,
      kind: 'song',
      title: song?.title ?? line.entry.songId.slice(0, SONG_ID_FALLBACK_LENGTH),
      durationSeconds: song?.durationSeconds ?? null,
      entryEnergy: line.entry.energy,
      songEnergy: song?.baseEnergy ?? null,
    };
  });
}

export function listItemIds(entryIds: readonly string[], breaks: readonly PlacedBreak[]): string[] {
  return interleaveBreaks(entryIds, breaks).map((line) =>
    line.kind === 'song' ? line.entry : line.setlistBreak.id,
  );
}
