/**
 * Repository for the instruments bounded context — the only file that
 * touches the DB client for this domain. Holds Drizzle queries and
 * transactions; the service orchestrates business rules above it.
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { instrumentTable } from './instruments.schema';

export interface InstrumentRow {
  id: string;
  name: string;
  isHarmonic: boolean;
}

/**
 * @Blueprint repository-projection
 * @BlueprintName Repository Projection Constant
 * @BlueprintUsage Use for a repository whose queries all return the same row shape.
 * @BlueprintDescription Declares the selected columns once as an `as const` object that every select and every `returning` clause reuses, so a new column reaches all four queries at once and the exported row interface has a single object to match rather than four column lists.
 */
const PROJECTION = {
  id: instrumentTable.id,
  name: instrumentTable.name,
  isHarmonic: instrumentTable.isHarmonic,
} as const;

export async function listInstruments(): Promise<InstrumentRow[]> {
  const database = getDatabase();
  return await database.select(PROJECTION).from(instrumentTable);
}

export async function insertInstrument(input: {
  name: string;
  isHarmonic: boolean;
}): Promise<InstrumentRow> {
  const database = getDatabase();
  const [row] = await database.insert(instrumentTable).values(input).returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function updateInstrument(
  id: string,
  updates: Partial<{ name: string; isHarmonic: boolean }>,
): Promise<InstrumentRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(instrumentTable)
    .set(updates)
    .where(eq(instrumentTable.id, id))
    .returning(PROJECTION);
  return row ?? null;
}

export async function deleteInstrument(id: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(instrumentTable)
    .where(eq(instrumentTable.id, id))
    .returning({ id: instrumentTable.id });
  return selectDeletionOutcome(deleted.length);
}
