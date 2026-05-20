/**
 * Service layer for instruments. Today the orchestration is thin
 * (CRUD with name-collation sorting) — the service exists so the
 * controller never imports the repository or the DB client, and so
 * future business rules (e.g. "cannot delete an instrument used in
 * any setlist") have a single place to land.
 */

import type { Database } from '../database/client';
import {
  type InstrumentRow,
  deleteInstrument,
  insertInstrument,
  listInstruments,
  updateInstrument,
} from './instruments.repository';

function byName(left: InstrumentRow, right: InstrumentRow): number {
  return left.name.localeCompare(right.name);
}

export async function getInstrumentsSorted(database: Database): Promise<InstrumentRow[]> {
  const rows = await listInstruments(database);
  return rows.toSorted(byName);
}

export async function createInstrument(
  database: Database,
  input: { name: string; isHarmonic: boolean },
): Promise<InstrumentRow> {
  return await insertInstrument(database, input);
}

export async function patchInstrument(
  database: Database,
  id: string,
  input: { name?: string; isHarmonic?: boolean },
): Promise<InstrumentRow | null> {
  const updates: Partial<{ name: string; isHarmonic: boolean }> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.isHarmonic !== undefined) updates.isHarmonic = input.isHarmonic;
  if (Object.keys(updates).length === 0) return null;
  return await updateInstrument(database, id, updates);
}

export async function removeInstrument(database: Database, id: string): Promise<boolean> {
  return await deleteInstrument(database, id);
}
