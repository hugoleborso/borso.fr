/**
 * Repository for the instruments bounded context — the only file that
 * touches the DB client for this domain. Holds Drizzle queries and
 * transactions; the service orchestrates business rules above it.
 */

import { eq } from 'drizzle-orm';
import type { Database } from '../database/client';
import { instrumentTable } from './instruments.schema';

export interface InstrumentRow {
  id: string;
  name: string;
  isHarmonic: boolean;
}

const PROJECTION = {
  id: instrumentTable.id,
  name: instrumentTable.name,
  isHarmonic: instrumentTable.isHarmonic,
} as const;

export async function listInstruments(database: Database): Promise<InstrumentRow[]> {
  return await database.select(PROJECTION).from(instrumentTable);
}

export async function insertInstrument(
  database: Database,
  input: { name: string; isHarmonic: boolean },
): Promise<InstrumentRow> {
  const [row] = await database.insert(instrumentTable).values(input).returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function updateInstrument(
  database: Database,
  id: string,
  updates: Partial<{ name: string; isHarmonic: boolean }>,
): Promise<InstrumentRow | null> {
  const [row] = await database
    .update(instrumentTable)
    .set(updates)
    .where(eq(instrumentTable.id, id))
    .returning(PROJECTION);
  return row ?? null;
}

export async function deleteInstrument(database: Database, id: string): Promise<boolean> {
  const deleted = await database
    .delete(instrumentTable)
    .where(eq(instrumentTable.id, id))
    .returning({ id: instrumentTable.id });
  return deleted.length > 0;
}
