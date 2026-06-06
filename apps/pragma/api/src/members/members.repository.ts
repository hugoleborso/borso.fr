/**
 * Repository for the members bounded context. Includes the M2M
 * assignment to instruments — the `memberInstrumentTable` is owned by
 * this domain since the relation is "this member plays these
 * instruments".
 */

import { eq, inArray, isNotNull } from 'drizzle-orm';
import type { Database, DatabaseExecutor } from '../database/client';
import { instrumentTable } from '../instruments/instruments.schema';
import { lineupOverrideSchema, setlistEntryTable } from '../setlists/setlists.schema';
import { defaultLineupSchema, songTable } from '../songs/songs.schema';
import { scrubMemberFromLineup } from './lineup-scrub.core';
import { memberInstrumentTable, memberTable } from './members.schema';

export interface MemberRow {
  id: string;
  firstName: string;
  color: string;
  avatarS3Key: string | null;
}

export interface MemberInstrumentRow {
  id: string;
  name: string;
  isHarmonic: boolean;
}

const MEMBER_PROJECTION = {
  id: memberTable.id,
  firstName: memberTable.firstName,
  color: memberTable.color,
  avatarS3Key: memberTable.avatarS3Key,
} as const;

const INSTRUMENT_PROJECTION = {
  id: instrumentTable.id,
  name: instrumentTable.name,
  isHarmonic: instrumentTable.isHarmonic,
} as const;

export async function listMembers(database: Database): Promise<MemberRow[]> {
  return await database.select(MEMBER_PROJECTION).from(memberTable);
}

export async function findMemberById(database: Database, id: string): Promise<MemberRow | null> {
  const rows = await database
    .select(MEMBER_PROJECTION)
    .from(memberTable)
    .where(eq(memberTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertMember(
  database: Database,
  values: { firstName: string; color: string; avatarS3Key: string | null },
): Promise<MemberRow> {
  const [row] = await database.insert(memberTable).values(values).returning(MEMBER_PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function updateMember(
  database: Database,
  id: string,
  updates: Partial<{ firstName: string; color: string; avatarS3Key: string | null }>,
): Promise<MemberRow | null> {
  const [row] = await database
    .update(memberTable)
    .set(updates)
    .where(eq(memberTable.id, id))
    .returning(MEMBER_PROJECTION);
  return row ?? null;
}

export async function deleteMemberWithLinks(database: Database, id: string): Promise<boolean> {
  return await database.transaction(async (tx) => {
    await scrubMemberFromSongDefaults(tx, id);
    await scrubMemberFromSetlistOverrides(tx, id);
    await tx.delete(memberInstrumentTable).where(eq(memberInstrumentTable.memberId, id));
    const deleted = await tx
      .delete(memberTable)
      .where(eq(memberTable.id, id))
      .returning({ id: memberTable.id });
    return deleted.length > 0;
  });
}

async function scrubMemberFromSongDefaults(tx: DatabaseExecutor, memberId: string): Promise<void> {
  const songs = await tx
    .select({ id: songTable.id, defaultLineup: songTable.defaultLineup })
    .from(songTable);
  for (const songRow of songs) {
    const lineupRaw: unknown = JSON.parse(songRow.defaultLineup);
    const lineup = defaultLineupSchema.parse(lineupRaw);
    if (!(memberId in lineup)) continue;
    const scrubbed = scrubMemberFromLineup(lineup, memberId);
    await tx
      .update(songTable)
      .set({ defaultLineup: JSON.stringify(scrubbed) })
      .where(eq(songTable.id, songRow.id));
  }
}

async function scrubMemberFromSetlistOverrides(
  tx: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  const entries = await tx
    .select({ id: setlistEntryTable.id, lineupOverride: setlistEntryTable.lineupOverride })
    .from(setlistEntryTable)
    .where(isNotNull(setlistEntryTable.lineupOverride));
  for (const entryRow of entries) {
    if (entryRow.lineupOverride === null) continue;
    const lineupRaw: unknown = JSON.parse(entryRow.lineupOverride);
    const lineup = lineupOverrideSchema.parse(lineupRaw);
    if (!(memberId in lineup)) continue;
    const scrubbed = scrubMemberFromLineup(lineup, memberId);
    await tx
      .update(setlistEntryTable)
      .set({ lineupOverride: JSON.stringify(scrubbed) })
      .where(eq(setlistEntryTable.id, entryRow.id));
  }
}

export async function listInstrumentsForMember(
  database: Database,
  memberId: string,
): Promise<MemberInstrumentRow[]> {
  return await database
    .select(INSTRUMENT_PROJECTION)
    .from(memberInstrumentTable)
    .innerJoin(instrumentTable, eq(memberInstrumentTable.instrumentId, instrumentTable.id))
    .where(eq(memberInstrumentTable.memberId, memberId));
}

export async function instrumentsExist(
  database: Database,
  instrumentIds: readonly string[],
): Promise<boolean> {
  if (instrumentIds.length === 0) return true;
  const rows = await database
    .select({ id: instrumentTable.id })
    .from(instrumentTable)
    .where(inArray(instrumentTable.id, [...instrumentIds]));
  return rows.length === instrumentIds.length;
}

export async function replaceMemberInstruments(
  database: Database,
  memberId: string,
  instrumentIds: readonly string[],
): Promise<void> {
  await database.delete(memberInstrumentTable).where(eq(memberInstrumentTable.memberId, memberId));
  if (instrumentIds.length > 0) {
    await database
      .insert(memberInstrumentTable)
      .values(instrumentIds.map((instrumentId) => ({ memberId, instrumentId })));
  }
}
