import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import type { WriteActor } from '../notifications/notifications.service';
import {
  countSongsBeforeEachBreak,
  mergeSetlistItems,
  placeBreakAfter,
  type SetlistItem,
} from './setlist-break.core';
import {
  deleteBreakWithin,
  insertBreakWithin,
  listBreaks,
  type SetlistBreakRow,
  updateBreakLabel,
} from './setlist-break.repository';
import { listEntries } from './setlist-entry.repository';
import {
  compactItemsWithin,
  listItemsWithin,
  writeItemOrderWithin,
} from './setlist-position.service';
import { didClaimSetlistWithin, runInOneSetlistTransaction } from './setlists.repository';
import type { setlistBreakCreateSchema } from './setlists.schema';
import { notifySetlistChangedById } from './setlists.service';

type BreakCreateInput = z.infer<typeof setlistBreakCreateSchema>;

export interface SetlistBreakView extends SetlistBreakRow {
  readonly songsBefore: number;
}

export async function getBreaks(setlistId: string): Promise<SetlistBreakView[]> {
  const [entries, breaks] = await Promise.all([listEntries(setlistId), listBreaks(setlistId)]);
  const songsBefore = countSongsBeforeEachBreak(mergeSetlistItems(entries, breaks));
  return breaks.map((row) => ({ ...row, songsBefore: songsBefore.get(row.id) ?? 0 }));
}

export type InsertBreakOutcome =
  | { kind: 'ok'; setlistBreak: SetlistBreakRow; breaks: SetlistBreakView[] }
  | { kind: 'not-found' }
  | { kind: 'entry-not-found' };

// @FollowsBlueprint service-crud-update
export async function insertBreak(
  setlistId: string,
  input: BreakCreateInput,
  actor: WriteActor,
): Promise<InsertBreakOutcome> {
  const outcome = await runInOneSetlistTransaction(
    async (executor): Promise<InsertBreakOutcome> => {
      const isSetlistClaimed = await didClaimSetlistWithin(executor, setlistId);
      if (!isSetlistClaimed) return { kind: 'not-found' };
      const runningOrder = await listItemsWithin(executor, setlistId);
      const breakId = randomUUID();
      const itemIds = runningOrder.map((item) => item.id);
      const orderedIds = placeBreakAfter(itemIds, input.afterEntryId, breakId);
      if (orderedIds === null) return { kind: 'entry-not-found' };
      const setlistBreak = await insertBreakWithin(executor, {
        id: breakId,
        setlistId,
        position: orderedIds.indexOf(breakId),
        label: input.label,
      });
      const placed: SetlistItem = { id: breakId, kind: 'break', position: setlistBreak.position };
      await writeItemOrderWithin(executor, [...runningOrder, placed], orderedIds);
      return { kind: 'ok', setlistBreak, breaks: [] };
    },
  );
  if (outcome.kind !== 'ok') return outcome;
  await notifySetlistChangedById(setlistId, actor);
  return { ...outcome, breaks: await getBreaks(setlistId) };
}

// @FollowsBlueprint service-crud-update
export async function renameBreak(
  setlistId: string,
  breakId: string,
  label: string,
  actor: WriteActor,
): Promise<
  { kind: 'ok'; setlistBreak: SetlistBreakRow; breaks: SetlistBreakView[] } | { kind: 'not-found' }
> {
  const setlistBreak = await updateBreakLabel(setlistId, breakId, label);
  if (setlistBreak === null) return { kind: 'not-found' };
  await notifySetlistChangedById(setlistId, actor);
  return { kind: 'ok', setlistBreak, breaks: await getBreaks(setlistId) };
}

export async function removeBreakAndCompact(
  setlistId: string,
  breakId: string,
  actor: WriteActor,
): Promise<{ kind: 'deleted'; breaks: SetlistBreakView[] } | { kind: 'not-found' }> {
  const outcome = await runInOneSetlistTransaction(async (executor): Promise<DeletionOutcome> => {
    const isSetlistClaimed = await didClaimSetlistWithin(executor, setlistId);
    if (!isSetlistClaimed) return 'not-found';
    const deletion = await deleteBreakWithin(executor, setlistId, breakId);
    await compactItemsWithin(executor, setlistId);
    return deletion;
  });
  if (outcome === 'not-found') return { kind: 'not-found' };
  await notifySetlistChangedById(setlistId, actor);
  return { kind: 'deleted', breaks: await getBreaks(setlistId) };
}
