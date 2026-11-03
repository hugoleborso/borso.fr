import type { DatabaseExecutor } from '../database/client';
import {
  mergeSetlistItems,
  selectNextItemPosition,
  type SetlistItem,
  type SetlistItemKind,
} from './setlist-break.core';
import { listBreakPositionsWithin, setBreakPositionWithin } from './setlist-break.repository';
import { listEntryPositionsWithin, setEntryPositionWithin } from './setlist-entry.repository';

export async function listItemsWithin(
  executor: DatabaseExecutor,
  setlistId: string,
): Promise<SetlistItem[]> {
  const [entries, breaks] = await Promise.all([
    listEntryPositionsWithin(executor, setlistId),
    listBreakPositionsWithin(executor, setlistId),
  ]);
  return mergeSetlistItems(entries, breaks);
}

export async function nextItemPositionWithin(
  executor: DatabaseExecutor,
  setlistId: string,
): Promise<number> {
  return selectNextItemPosition(await listItemsWithin(executor, setlistId));
}

const POSITION_WRITERS: Readonly<
  Record<
    SetlistItemKind,
    (executor: DatabaseExecutor, id: string, position: number) => Promise<void>
  >
> = { song: setEntryPositionWithin, break: setBreakPositionWithin };

export async function writeItemOrderWithin(
  executor: DatabaseExecutor,
  runningOrder: readonly SetlistItem[],
  orderedIds: readonly string[],
): Promise<void> {
  const kindById = new Map(runningOrder.map((item) => [item.id, item.kind]));
  for (const [position, id] of orderedIds.entries()) {
    const kind = kindById.get(id) ?? 'song';
    await POSITION_WRITERS[kind](executor, id, position);
  }
}

export async function compactItemsWithin(
  executor: DatabaseExecutor,
  setlistId: string,
): Promise<void> {
  const runningOrder = await listItemsWithin(executor, setlistId);
  await writeItemOrderWithin(
    executor,
    runningOrder,
    runningOrder.map((item) => item.id),
  );
}
