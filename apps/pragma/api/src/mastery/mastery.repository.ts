/**
 * Repository for the mastery bounded context.
 */

import { and, eq } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { masteryDefaultTable, masteryOverrideTable } from './mastery.schema';

export interface MasteryDefaultRow {
  memberId: string;
  instrumentId: string;
  score: number;
}

export interface MasteryOverrideRow {
  memberId: string;
  instrumentId: string;
  songId: string;
  score: number;
}

export async function listMasteryDefaults(): Promise<MasteryDefaultRow[]> {
  const database = getDatabase();
  return await database
    .select({
      memberId: masteryDefaultTable.memberId,
      instrumentId: masteryDefaultTable.instrumentId,
      score: masteryDefaultTable.score,
    })
    .from(masteryDefaultTable);
}

export async function upsertMasteryDefault(row: MasteryDefaultRow): Promise<void> {
  const database = getDatabase();
  await database
    .insert(masteryDefaultTable)
    .values(row)
    .onConflictDoUpdate({
      target: [masteryDefaultTable.memberId, masteryDefaultTable.instrumentId],
      set: { score: row.score },
    });
}

export async function deleteMasteryDefault(
  memberId: string,
  instrumentId: string,
): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(masteryDefaultTable)
    .where(
      and(
        eq(masteryDefaultTable.memberId, memberId),
        eq(masteryDefaultTable.instrumentId, instrumentId),
      ),
    )
    .returning({ memberId: masteryDefaultTable.memberId });
  return selectDeletionOutcome(deleted.length);
}

export async function listMasteryOverridesForSong(songId: string): Promise<MasteryOverrideRow[]> {
  const database = getDatabase();
  return await database
    .select({
      memberId: masteryOverrideTable.memberId,
      instrumentId: masteryOverrideTable.instrumentId,
      songId: masteryOverrideTable.songId,
      score: masteryOverrideTable.score,
    })
    .from(masteryOverrideTable)
    .where(eq(masteryOverrideTable.songId, songId));
}

export async function upsertMasteryOverride(row: MasteryOverrideRow): Promise<void> {
  const database = getDatabase();
  await database
    .insert(masteryOverrideTable)
    .values(row)
    .onConflictDoUpdate({
      target: [
        masteryOverrideTable.memberId,
        masteryOverrideTable.instrumentId,
        masteryOverrideTable.songId,
      ],
      set: { score: row.score },
    });
}

export async function deleteMasteryOverride(
  memberId: string,
  instrumentId: string,
  songId: string,
): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(masteryOverrideTable)
    .where(
      and(
        eq(masteryOverrideTable.memberId, memberId),
        eq(masteryOverrideTable.instrumentId, instrumentId),
        eq(masteryOverrideTable.songId, songId),
      ),
    )
    .returning({ memberId: masteryOverrideTable.memberId });
  return selectDeletionOutcome(deleted.length);
}
