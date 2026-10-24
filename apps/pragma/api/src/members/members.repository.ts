import { eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { deleteCredentialsOfMember } from '../auth/credentials.service';
import { deleteCalendarFeedOfMember } from '../calendar-feeds/calendar-feeds.service';
import { deleteVotesOfDeletedMember } from '../setlists/voting.service';
import { deleteScoreHistoryOfDeletedMember } from '../mastery/mastery.service';
import { deleteStudiesOfDeletedMember } from '../studies/studies.service';
import { deletePushStateOfDeletedMember } from '../notifications/notifications.service';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { barTable } from '../bars/bars.schema';
import { instrumentTable } from '../instruments/instruments.schema';
import { lineupOverrideSchema, setlistEntryTable } from '../setlists/setlists.schema';
import { defaultLineupSchema, songTable } from '../songs/songs.schema';
import { unassignTasksOfMemberBeingDeleted } from '../tasks/tasks.service';
import { scrubMemberFromLineup } from './lineup-scrub.core';
import {
  decidePrimaryInstrumentIds,
  type InstrumentFamily,
  type InstrumentIcon,
  resolveInstrumentFamily,
  resolveInstrumentIcon,
  resolveInstrumentPosition,
} from '@domain/instrument.core';
import { memberInstrumentTable, memberTable } from './members.schema';

export type MemberRow = typeof memberTable.$inferSelect;

type InstrumentTableRow = typeof instrumentTable.$inferSelect;

export type MemberInstrumentRow = Pick<InstrumentTableRow, 'id' | 'name'> & {
  family: InstrumentFamily;
  icon: InstrumentIcon;
  position: number;
  isPrimary: boolean;
};

type MemberInstrumentJoinedRow = Pick<
  InstrumentTableRow,
  'id' | 'name' | 'isHarmonic' | 'family' | 'icon' | 'position'
> &
  Pick<typeof memberInstrumentTable.$inferSelect, 'isPrimary'>;

// @FollowsBlueprint repository-projection
const MEMBER_PROJECTION = {
  id: memberTable.id,
  firstName: memberTable.firstName,
  color: memberTable.color,
  avatarS3Key: memberTable.avatarS3Key,
  phone: memberTable.phone,
  email: memberTable.email,
} as const;

const INSTRUMENT_PROJECTION = {
  id: instrumentTable.id,
  name: instrumentTable.name,
  isHarmonic: instrumentTable.isHarmonic,
  family: instrumentTable.family,
  icon: instrumentTable.icon,
  position: instrumentTable.position,
  isPrimary: memberInstrumentTable.isPrimary,
} as const;

function rowToMemberInstrument(row: MemberInstrumentJoinedRow): MemberInstrumentRow {
  return {
    id: row.id,
    name: row.name,
    family: resolveInstrumentFamily(row.family, row.isHarmonic),
    icon: resolveInstrumentIcon(row.icon),
    position: resolveInstrumentPosition(row.position),
    isPrimary: row.isPrimary === true,
  };
}

export async function listMembers(): Promise<MemberRow[]> {
  const database = getDatabase();
  return await database.select(MEMBER_PROJECTION).from(memberTable);
}

export type MemberPersistedShape = Omit<MemberRow, 'id'>;

export async function insertMember(values: MemberPersistedShape): Promise<MemberRow> {
  const database = getDatabase();
  const [row] = await database.insert(memberTable).values(values).returning(MEMBER_PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function updateMember(
  id: string,
  updates: Partial<MemberPersistedShape>,
): Promise<MemberRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(memberTable)
    .set(updates)
    .where(eq(memberTable.id, id))
    .returning(MEMBER_PROJECTION);
  return row ?? null;
}

export async function didClaimMemberWithin(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<boolean> {
  const claimed = await executor
    .update(memberTable)
    .set({ firstName: sql`${memberTable.firstName}` })
    .where(eq(memberTable.id, memberId))
    .returning({ id: memberTable.id });
  return claimed.length > 0;
}

export async function deleteMemberWithLinks(id: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  return await database.transaction(async (transaction) => {
    const deleted = await transaction
      .delete(memberTable)
      .where(eq(memberTable.id, id))
      .returning({ id: memberTable.id });
    await unassignBarsOwnedByMember(transaction, id);
    await scrubMemberFromSongDefaults(transaction, id);
    await scrubMemberFromSetlistOverrides(transaction, id);
    await transaction.delete(memberInstrumentTable).where(eq(memberInstrumentTable.memberId, id));
    await deleteCredentialsOfMember(transaction, id);
    await deleteCalendarFeedOfMember(transaction, id);
    await deleteVotesOfDeletedMember(transaction, id);
    await unassignTasksOfMemberBeingDeleted(transaction, id);
    await deleteScoreHistoryOfDeletedMember(transaction, id);
    await deleteStudiesOfDeletedMember(transaction, id);
    await deletePushStateOfDeletedMember(transaction, id);
    return selectDeletionOutcome(deleted.length);
  });
}

async function unassignBarsOwnedByMember(
  transaction: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await transaction
    .update(barTable)
    .set({ ownerMemberId: null })
    .where(eq(barTable.ownerMemberId, memberId));
}

async function scrubMemberFromSongDefaults(
  transaction: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  const songs = await transaction
    .select({ id: songTable.id, defaultLineup: songTable.defaultLineup })
    .from(songTable);
  for (const songRow of songs) {
    const lineupRaw: unknown = JSON.parse(songRow.defaultLineup);
    const lineup = defaultLineupSchema.parse(lineupRaw);
    if (!(memberId in lineup)) continue;
    const scrubbed = scrubMemberFromLineup(lineup, memberId);
    await transaction
      .update(songTable)
      .set({ defaultLineup: JSON.stringify(scrubbed) })
      .where(eq(songTable.id, songRow.id));
  }
}

async function scrubMemberFromSetlistOverrides(
  transaction: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  const assignmentRows = await transaction
    .select({ id: setlistEntryTable.id, lineupOverride: setlistEntryTable.lineupOverride })
    .from(setlistEntryTable)
    .where(isNotNull(setlistEntryTable.lineupOverride));
  for (const entryRow of assignmentRows) {
    if (entryRow.lineupOverride === null) continue;
    const lineupRaw: unknown = JSON.parse(entryRow.lineupOverride);
    const lineup = lineupOverrideSchema.parse(lineupRaw);
    if (!(memberId in lineup)) continue;
    const scrubbed = scrubMemberFromLineup(lineup, memberId);
    await transaction
      .update(setlistEntryTable)
      .set({ lineupOverride: JSON.stringify(scrubbed) })
      .where(eq(setlistEntryTable.id, entryRow.id));
  }
}

export async function listInstrumentsForMember(memberId: string): Promise<MemberInstrumentRow[]> {
  const database = getDatabase();
  const rows = await database
    .select(INSTRUMENT_PROJECTION)
    .from(memberInstrumentTable)
    .innerJoin(instrumentTable, eq(memberInstrumentTable.instrumentId, instrumentTable.id))
    .where(eq(memberInstrumentTable.memberId, memberId));
  return rows.map((row) => rowToMemberInstrument(row));
}

export async function areInstrumentsKnown(instrumentIds: readonly string[]): Promise<boolean> {
  const database = getDatabase();
  if (instrumentIds.length === 0) return true;
  const rows = await database
    .select({ id: instrumentTable.id })
    .from(instrumentTable)
    .where(inArray(instrumentTable.id, [...instrumentIds]));
  return rows.length === instrumentIds.length;
}

export async function didReplaceMemberInstruments(
  memberId: string,
  instrumentIds: readonly string[],
  requestedPrimaryInstrumentIds?: readonly string[],
): Promise<boolean> {
  const database = getDatabase();
  return await database.transaction(async (transaction) => {
    const isMemberClaimed = await didClaimMemberWithin(transaction, memberId);
    if (!isMemberClaimed) return false;
    const existing = await transaction
      .select({
        instrumentId: memberInstrumentTable.instrumentId,
        isPrimary: memberInstrumentTable.isPrimary,
      })
      .from(memberInstrumentTable)
      .where(eq(memberInstrumentTable.memberId, memberId));
    const survivingPrimaryInstrumentIds = existing
      .filter((link) => link.isPrimary === true)
      .map((link) => link.instrumentId);
    const primaryInstrumentIds = new Set(
      decidePrimaryInstrumentIds(
        instrumentIds,
        requestedPrimaryInstrumentIds,
        survivingPrimaryInstrumentIds,
      ),
    );
    await transaction
      .delete(memberInstrumentTable)
      .where(eq(memberInstrumentTable.memberId, memberId));
    if (instrumentIds.length > 0) {
      await transaction.insert(memberInstrumentTable).values(
        instrumentIds.map((instrumentId) => ({
          memberId,
          instrumentId,
          isPrimary: primaryInstrumentIds.has(instrumentId),
        })),
      );
    }
    return true;
  });
}
