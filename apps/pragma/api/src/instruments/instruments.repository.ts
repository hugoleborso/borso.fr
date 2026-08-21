import { eq } from 'drizzle-orm';
import { type InstrumentFamily, resolveInstrumentFamily } from '@domain/instrument.core';
import { getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { instrumentTable } from './instruments.schema';

export interface InstrumentRow {
  id: string;
  name: string;
  family: InstrumentFamily;
}

interface InstrumentRawRow {
  id: string;
  name: string;
  isHarmonic: boolean;
  family: string | null;
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
  family: instrumentTable.family,
} as const;

function rowToInstrument(row: InstrumentRawRow): InstrumentRow {
  return {
    id: row.id,
    name: row.name,
    family: resolveInstrumentFamily(row.family, row.isHarmonic),
  };
}

function encodeFamily(family: InstrumentFamily): { family: string; isHarmonic: boolean } {
  return { family, isHarmonic: family === 'harmonic' };
}

export async function listInstruments(): Promise<InstrumentRow[]> {
  const database = getDatabase();
  const rows = await database.select(PROJECTION).from(instrumentTable);
  return rows.map((row) => rowToInstrument(row));
}

export async function insertInstrument(input: {
  name: string;
  family: InstrumentFamily;
}): Promise<InstrumentRow> {
  const database = getDatabase();
  const [row] = await database
    .insert(instrumentTable)
    .values({ name: input.name, ...encodeFamily(input.family) })
    .returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return rowToInstrument(row);
}

export async function updateInstrument(
  id: string,
  updates: Partial<{ name: string; family: InstrumentFamily }>,
): Promise<InstrumentRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(instrumentTable)
    .set({
      ...(updates.name === undefined ? {} : { name: updates.name }),
      ...(updates.family === undefined ? {} : encodeFamily(updates.family)),
    })
    .where(eq(instrumentTable.id, id))
    .returning(PROJECTION);
  return row === undefined ? null : rowToInstrument(row);
}

export async function deleteInstrument(id: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(instrumentTable)
    .where(eq(instrumentTable.id, id))
    .returning({ id: instrumentTable.id });
  return selectDeletionOutcome(deleted.length);
}
