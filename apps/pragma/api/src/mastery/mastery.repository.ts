/**
 * Repository for the mastery bounded context.
 */

import { and, eq } from 'drizzle-orm';
import type { Database } from '../database/client';
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

export async function listMasteryDefaults(database: Database): Promise<MasteryDefaultRow[]> {
  return await database
    .select({
      memberId: masteryDefaultTable.memberId,
      instrumentId: masteryDefaultTable.instrumentId,
      score: masteryDefaultTable.score,
    })
    .from(masteryDefaultTable);
}

export async function upsertMasteryDefault(
  database: Database,
  row: MasteryDefaultRow,
): Promise<void> {
  await database
    .insert(masteryDefaultTable)
    .values(row)
    .onConflictDoUpdate({
      target: [masteryDefaultTable.memberId, masteryDefaultTable.instrumentId],
      set: { score: row.score },
    });
}

export async function deleteMasteryDefault(
  database: Database,
  memberId: string,
  instrumentId: string,
): Promise<boolean> {
  const deleted = await database
    .delete(masteryDefaultTable)
    .where(
      and(
        eq(masteryDefaultTable.memberId, memberId),
        eq(masteryDefaultTable.instrumentId, instrumentId),
      ),
    )
    .returning({ memberId: masteryDefaultTable.memberId });
  return deleted.length > 0;
}

export async function listMasteryOverridesForSong(
  database: Database,
  songId: string,
): Promise<MasteryOverrideRow[]> {
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

export async function upsertMasteryOverride(
  database: Database,
  row: MasteryOverrideRow,
): Promise<void> {
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
  database: Database,
  memberId: string,
  instrumentId: string,
  songId: string,
): Promise<boolean> {
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
  return deleted.length > 0;
}
