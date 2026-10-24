import { isReorderOfTheSameIds } from '../helpers/ordering/reorder.core';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { comparePositionThenName, foldPlayersIntoInstruments } from './instrument-players.core';
import {
  deleteInstrumentWithLinks,
  didClaimInstrumentsWithin,
  type InstrumentCreateInput,
  type InstrumentUpdates,
  type InstrumentWithPlayersRow,
  insertInstrument,
  listInstrumentIdsWithin,
  listInstrumentPlayerLinks,
  listInstruments,
  listPlayersOfInstrument,
  runInOneInstrumentTransaction,
  setInstrumentPositionWithin,
  updateInstrument,
} from './instruments.repository';

export { didClaimInstrumentsWithin } from './instruments.repository';

export async function getInstrumentsSorted(): Promise<InstrumentWithPlayersRow[]> {
  const [instruments, links] = await Promise.all([listInstruments(), listInstrumentPlayerLinks()]);
  return foldPlayersIntoInstruments(instruments, links).toSorted(comparePositionThenName);
}

export async function createInstrument(
  input: InstrumentCreateInput,
): Promise<InstrumentWithPlayersRow> {
  return { ...(await insertInstrument(input)), players: [] };
}

export type PatchInstrumentResult =
  { kind: 'ok'; instrument: InstrumentWithPlayersRow } | { kind: 'empty' } | { kind: 'not-found' };

// @FollowsBlueprint service-crud-update
export async function patchInstrument(
  id: string,
  input: InstrumentUpdates,
): Promise<PatchInstrumentResult> {
  const updates: InstrumentUpdates = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.family !== undefined) updates.family = input.family;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.position !== undefined) updates.position = input.position;
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  const instrument = await updateInstrument(id, updates);
  if (instrument === null) return { kind: 'not-found' };
  return { kind: 'ok', instrument: { ...instrument, players: await listPlayersOfInstrument(id) } };
}

export type ReorderInstrumentsResult =
  { kind: 'ok'; instruments: InstrumentWithPlayersRow[] } | { kind: 'stale' };

type InstrumentReorder = { kind: 'ok' } | { kind: 'stale' };

export async function reorderInstruments(
  instrumentIds: readonly string[],
): Promise<ReorderInstrumentsResult> {
  const reorder = await runInOneInstrumentTransaction(
    async (executor): Promise<InstrumentReorder> => {
      const areInstrumentsClaimed = await didClaimInstrumentsWithin(executor, instrumentIds);
      if (!areInstrumentsClaimed) return { kind: 'stale' };
      const existingIds = await listInstrumentIdsWithin(executor);
      const isCurrent = isReorderOfTheSameIds(existingIds, instrumentIds);
      if (!isCurrent) return { kind: 'stale' };
      for (const [position, instrumentId] of instrumentIds.entries()) {
        await setInstrumentPositionWithin(executor, instrumentId, position);
      }
      return { kind: 'ok' };
    },
  );
  if (reorder.kind === 'stale') return reorder;
  return { kind: 'ok', instruments: await getInstrumentsSorted() };
}

export async function removeInstrument(id: string): Promise<DeletionOutcome> {
  return await deleteInstrumentWithLinks(id);
}
