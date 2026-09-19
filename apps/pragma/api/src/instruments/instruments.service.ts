import type { InstrumentFamily, InstrumentIcon } from '@domain/instrument.core';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { comparePositionThenName } from './instrument-players.core';
import {
  deleteInstrument,
  type InstrumentUpdates,
  type InstrumentWithPlayersRow,
  insertInstrument,
  listInstrumentsWithPlayers,
  listPlayersOfInstrument,
  setInstrumentPosition,
  updateInstrument,
} from './instruments.repository';

export async function getInstrumentsSorted(): Promise<InstrumentWithPlayersRow[]> {
  const rows = await listInstrumentsWithPlayers();
  return rows.toSorted(comparePositionThenName);
}

export async function createInstrument(input: {
  name: string;
  family: InstrumentFamily;
  icon?: InstrumentIcon;
  position?: number;
}): Promise<InstrumentWithPlayersRow> {
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

export async function reorderInstruments(
  instrumentIds: readonly string[],
): Promise<ReorderInstrumentsResult> {
  const existing = await listInstrumentsWithPlayers();
  if (instrumentIds.length !== existing.length) return { kind: 'stale' };
  const existingIds = new Set(existing.map((row) => row.id));
  for (const instrumentId of instrumentIds) {
    if (!existingIds.has(instrumentId)) return { kind: 'stale' };
  }
  for (let position = 0; position < instrumentIds.length; position += 1) {
    const instrumentId = instrumentIds[position];
    if (instrumentId === undefined) continue;
    await setInstrumentPosition(instrumentId, position);
  }
  return { kind: 'ok', instruments: await getInstrumentsSorted() };
}

export async function removeInstrument(id: string): Promise<DeletionOutcome> {
  return await deleteInstrument(id);
}
