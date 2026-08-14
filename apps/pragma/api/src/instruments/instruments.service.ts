/**
 * Service layer for instruments. Today the orchestration is thin
 * (CRUD with name-collation sorting) — the service exists so the
 * controller never imports the repository or the DB client, and so
 * future business rules (e.g. "cannot delete an instrument used in
 * any setlist") have a single place to land.
 */

import type { InstrumentFamily } from '@domain/instrument.core';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  deleteInstrument,
  type InstrumentRow,
  insertInstrument,
  listInstruments,
  updateInstrument,
} from './instruments.repository';

function byName(left: InstrumentRow, right: InstrumentRow): number {
  return left.name.localeCompare(right.name);
}

export async function getInstrumentsSorted(): Promise<InstrumentRow[]> {
  const rows = await listInstruments();
  return rows.toSorted(byName);
}

export async function createInstrument(input: {
  name: string;
  family: InstrumentFamily;
}): Promise<InstrumentRow> {
  return await insertInstrument(input);
}

export type PatchInstrumentResult =
  { kind: 'ok'; instrument: InstrumentRow } | { kind: 'empty' } | { kind: 'not-found' };

// @FollowsBlueprint service-crud-update
export async function patchInstrument(
  id: string,
  input: { name?: string; family?: InstrumentFamily },
): Promise<PatchInstrumentResult> {
  const updates: Partial<{ name: string; family: InstrumentFamily }> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.family !== undefined) updates.family = input.family;
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  const instrument = await updateInstrument(id, updates);
  if (instrument === null) return { kind: 'not-found' };
  return { kind: 'ok', instrument };
}

export async function removeInstrument(id: string): Promise<DeletionOutcome> {
  return await deleteInstrument(id);
}
