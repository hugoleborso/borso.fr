import { eq, inArray, like, sql } from 'drizzle-orm';
import type { z } from 'zod';
import {
  defaultPositionForFamily,
  type InstrumentFamily,
  type InstrumentIcon,
  resolveInstrumentFamily,
  resolveInstrumentIcon,
  resolveInstrumentPosition,
} from '@domain/instrument.core';
import { type InstrumentId, type Lineup, withoutInstrument } from '@domain/lineup.core';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { retryingConflictAborts } from '../helpers/persistence/conflict-abort.core';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { memberInstrumentTable, memberTable } from '../members/members.schema';
import { lineupOverrideSchema, setlistEntryTable } from '../setlists/setlists.schema';
import { defaultLineupSchema, songTable } from '../songs/songs.schema';
import type { NamedEntity } from './lineup-names.core';
import type { InstrumentPlayer, InstrumentPlayerLink } from './instrument-players.core';
import {
  type createInstrumentSchema,
  instrumentTable,
  type updateInstrumentSchema,
} from './instruments.schema';

type InstrumentRawRow = typeof instrumentTable.$inferSelect;

export type InstrumentRow = Omit<
  InstrumentRawRow,
  'isHarmonic' | 'family' | 'icon' | 'position'
> & {
  family: InstrumentFamily;
  icon: InstrumentIcon;
  position: number;
};

export type InstrumentWithPlayersRow = InstrumentRow & { players: readonly InstrumentPlayer[] };

export type InstrumentCreateInput = z.infer<typeof createInstrumentSchema>;

export type InstrumentUpdates = z.infer<typeof updateInstrumentSchema>;

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

// @FollowsBlueprint repository-owned-transaction
export async function runInOneInstrumentTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await retryingConflictAborts(async () => await getDatabase().transaction(work));
}

function encodeFamily(family: InstrumentFamily): { family: string; isHarmonic: boolean } {
  return { family, isHarmonic: family === 'harmonic' };
}

export async function listInstruments(): Promise<InstrumentRow[]> {
  const database = getDatabase();
  const rows = await database.select(PROJECTION).from(instrumentTable);
  return rows.map((row) => rowToInstrument(row));
}

export async function listInstrumentPlayerLinks(): Promise<InstrumentPlayerLink[]> {
  return await getDatabase()
    .select({
      instrumentId: memberInstrumentTable.instrumentId,
      memberId: memberInstrumentTable.memberId,
      isPrimary: memberInstrumentTable.isPrimary,
    })
    .from(memberInstrumentTable);
}

export async function listMemberNames(): Promise<NamedEntity[]> {
  return await getDatabase()
    .select({ id: memberTable.id, name: memberTable.firstName })
    .from(memberTable);
}

export async function listInstrumentIdsWithin(executor: DatabaseExecutor): Promise<string[]> {
  const rows = await executor.select({ id: instrumentTable.id }).from(instrumentTable);
  return rows.map((row) => row.id);
}

export async function insertInstrument(input: InstrumentCreateInput): Promise<InstrumentRow> {
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

export async function setInstrumentPositionWithin(
  executor: DatabaseExecutor,
  id: string,
  position: number,
): Promise<void> {
  await executor.update(instrumentTable).set({ position }).where(eq(instrumentTable.id, id));
}

export async function didClaimInstrumentsWithin(
  executor: DatabaseExecutor,
  instrumentIds: readonly string[],
): Promise<boolean> {
  const distinctIds = [...new Set(instrumentIds)];
  if (distinctIds.length === 0) return true;
  const claimed = await executor
    .update(instrumentTable)
    .set({ name: sql`${instrumentTable.name}` })
    .where(inArray(instrumentTable.id, distinctIds))
    .returning({ id: instrumentTable.id });
  return claimed.length === distinctIds.length;
}

function encodeLineupWithout(
  encoded: string,
  parse: (raw: unknown) => Lineup,
  instrumentId: InstrumentId,
): string {
  const raw: unknown = JSON.parse(encoded);
  return JSON.stringify(withoutInstrument(parse(raw), instrumentId));
}

async function dropInstrumentFromSongLineupsWithin(
  executor: DatabaseExecutor,
  instrumentId: InstrumentId,
): Promise<void> {
  const songsHoldingInstrument = await executor
    .select({ id: songTable.id, defaultLineup: songTable.defaultLineup })
    .from(songTable)
    .where(like(songTable.defaultLineup, `%${instrumentId}%`));
  for (const song of songsHoldingInstrument) {
    const defaultLineup = encodeLineupWithout(
      song.defaultLineup,
      (raw) => defaultLineupSchema.parse(raw),
      instrumentId,
    );
    await executor.update(songTable).set({ defaultLineup }).where(eq(songTable.id, song.id));
  }
}

async function dropInstrumentFromEntryLineupsWithin(
  executor: DatabaseExecutor,
  instrumentId: InstrumentId,
): Promise<void> {
  const entriesHoldingInstrument = await executor
    .select({ id: setlistEntryTable.id, lineupOverride: setlistEntryTable.lineupOverride })
    .from(setlistEntryTable)
    .where(like(setlistEntryTable.lineupOverride, `%${instrumentId}%`));
  for (const entry of entriesHoldingInstrument) {
    if (entry.lineupOverride === null) continue;
    const lineupOverride = encodeLineupWithout(
      entry.lineupOverride,
      (raw) => lineupOverrideSchema.parse(raw),
      instrumentId,
    );
    await executor
      .update(setlistEntryTable)
      .set({ lineupOverride })
      .where(eq(setlistEntryTable.id, entry.id));
  }
}

export async function deleteInstrumentWithLinks(id: string): Promise<DeletionOutcome> {
  return await runInOneInstrumentTransaction(async (transaction) => {
    const deleted = await transaction
      .delete(instrumentTable)
      .where(eq(instrumentTable.id, id))
      .returning({ id: instrumentTable.id });
    await transaction
      .delete(memberInstrumentTable)
      .where(eq(memberInstrumentTable.instrumentId, id));
    await dropInstrumentFromSongLineupsWithin(transaction, id);
    await dropInstrumentFromEntryLineupsWithin(transaction, id);
    return selectDeletionOutcome(deleted.length);
  });
}
