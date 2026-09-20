import { eq } from 'drizzle-orm';
import {
  defaultPositionForFamily,
  type InstrumentFamily,
  type InstrumentIcon,
  resolveInstrumentFamily,
  resolveInstrumentIcon,
  resolveInstrumentPosition,
} from '@domain/instrument.core';
import { getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { memberInstrumentTable } from '../members/members.schema';
import { foldPlayersIntoInstruments, type InstrumentPlayer } from './instrument-players.core';
import { instrumentTable } from './instruments.schema';

export interface InstrumentRow {
  id: string;
  name: string;
  family: InstrumentFamily;
  icon: InstrumentIcon;
  position: number;
}

export interface InstrumentWithPlayersRow extends InstrumentRow {
  players: readonly InstrumentPlayer[];
}

interface InstrumentRawRow {
  id: string;
  name: string;
  isHarmonic: boolean;
  family: string | null;
  icon: string | null;
  position: number | null;
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
  icon: instrumentTable.icon,
  position: instrumentTable.position,
} as const;

function rowToInstrument(row: InstrumentRawRow): InstrumentRow {
  return {
    id: row.id,
    name: row.name,
    family: resolveInstrumentFamily(row.family, row.isHarmonic),
    icon: resolveInstrumentIcon(row.icon),
    position: resolveInstrumentPosition(row.position),
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

export async function listInstrumentsWithPlayers(): Promise<InstrumentWithPlayersRow[]> {
  const database = getDatabase();
  const [instrumentRows, linkRows] = await Promise.all([
    listInstruments(),
    database
      .select({
        instrumentId: memberInstrumentTable.instrumentId,
        memberId: memberInstrumentTable.memberId,
        isPrimary: memberInstrumentTable.isPrimary,
      })
      .from(memberInstrumentTable),
  ]);
  return foldPlayersIntoInstruments(instrumentRows, linkRows);
}

export async function insertInstrument(input: {
  name: string;
  family: InstrumentFamily;
  icon?: InstrumentIcon;
  position?: number;
}): Promise<InstrumentRow> {
  const database = getDatabase();
  const [row] = await database
    .insert(instrumentTable)
    .values({
      name: input.name,
      ...encodeFamily(input.family),
      icon: input.icon ?? null,
      position: input.position ?? defaultPositionForFamily(input.family),
    })
    .returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return rowToInstrument(row);
}

export interface InstrumentUpdates {
  name?: string;
  family?: InstrumentFamily;
  icon?: InstrumentIcon;
  position?: number;
}

export async function updateInstrument(
  id: string,
  updates: InstrumentUpdates,
): Promise<InstrumentRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(instrumentTable)
    .set({
      ...(updates.name === undefined ? {} : { name: updates.name }),
      ...(updates.family === undefined ? {} : encodeFamily(updates.family)),
      ...(updates.icon === undefined ? {} : { icon: updates.icon }),
      ...(updates.position === undefined ? {} : { position: updates.position }),
    })
    .where(eq(instrumentTable.id, id))
    .returning(PROJECTION);
  return row === undefined ? null : rowToInstrument(row);
}

export async function listPlayersOfInstrument(instrumentId: string): Promise<InstrumentPlayer[]> {
  const database = getDatabase();
  const rows = await database
    .select({
      memberId: memberInstrumentTable.memberId,
      isPrimary: memberInstrumentTable.isPrimary,
    })
    .from(memberInstrumentTable)
    .where(eq(memberInstrumentTable.instrumentId, instrumentId));
  return rows.map((row) => ({ memberId: row.memberId, isPrimary: row.isPrimary === true }));
}

export async function setInstrumentPosition(id: string, position: number): Promise<void> {
  const database = getDatabase();
  await database.update(instrumentTable).set({ position }).where(eq(instrumentTable.id, id));
}

export async function deleteInstrument(id: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(instrumentTable)
    .where(eq(instrumentTable.id, id))
    .returning({ id: instrumentTable.id });
  return selectDeletionOutcome(deleted.length);
}
