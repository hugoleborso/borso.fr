import { isReorderOfTheSameIds } from '../helpers/ordering/reorder.core';

export type SetlistItemKind = 'song' | 'break';

export interface SetlistItem {
  readonly id: string;
  readonly kind: SetlistItemKind;
  readonly position: number;
}

interface PositionedRow {
  readonly id: string;
  readonly position: number;
}

function compareItems(left: SetlistItem, right: SetlistItem): number {
  if (left.position !== right.position) return left.position - right.position;
  return left.id.localeCompare(right.id);
}

// @FollowsBlueprint core-projection
export function mergeSetlistItems(
  entries: readonly PositionedRow[],
  breaks: readonly PositionedRow[],
): SetlistItem[] {
  const songs = entries.map((entry): SetlistItem => ({ ...entry, kind: 'song' }));
  const breakItems = breaks.map((row): SetlistItem => ({ ...row, kind: 'break' }));
  return [...songs, ...breakItems].toSorted(compareItems);
}

// @FollowsBlueprint core-decision
export function arrangeReorder(
  items: readonly SetlistItem[],
  requestedIds: readonly string[],
): string[] | null {
  const itemIds = items.map((item) => item.id);
  if (isReorderOfTheSameIds(itemIds, requestedIds)) return [...requestedIds];
  const songIds = items.filter((item) => item.kind === 'song').map((item) => item.id);
  if (!isReorderOfTheSameIds(songIds, requestedIds)) return null;
  const arranged = [...requestedIds];
  for (const [slot, item] of items.entries()) {
    if (item.kind === 'break') arranged.splice(slot, 0, item.id);
  }
  return arranged;
}

// @FollowsBlueprint core-decision
export function placeBreakAfter(
  itemIds: readonly string[],
  anchorId: string,
  breakId: string,
): string[] | null {
  const anchorIndex = itemIds.indexOf(anchorId);
  if (anchorIndex === -1) return null;
  return itemIds.toSpliced(anchorIndex + 1, 0, breakId);
}

// @FollowsBlueprint core-projection
export function countSongsBeforeEachBreak(
  items: readonly SetlistItem[],
): ReadonlyMap<string, number> {
  const songsBefore = new Map<string, number>();
  let songCount = 0;
  for (const item of items) {
    if (item.kind === 'song') songCount += 1;
    else songsBefore.set(item.id, songCount);
  }
  return songsBefore;
}

const FIRST_POSITION = 0;

// @FollowsBlueprint core-decision
export function selectNextItemPosition(items: readonly SetlistItem[]): number {
  const last = items.at(-1);
  return last === undefined ? FIRST_POSITION : last.position + 1;
}
