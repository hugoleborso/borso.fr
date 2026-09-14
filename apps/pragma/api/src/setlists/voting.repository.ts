import { and, eq } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { setlistEntryTable, setlistTable, setlistVoteTable } from './setlists.schema';

export interface VoteRow {
  setlistId: string;
  memberId: string;
  songId: string;
  points: number;
  updatedAt: Date;
}

// @FollowsBlueprint repository-projection
const VOTE_PROJECTION = {
  setlistId: setlistVoteTable.setlistId,
  memberId: setlistVoteTable.memberId,
  songId: setlistVoteTable.songId,
  points: setlistVoteTable.points,
  updatedAt: setlistVoteTable.updatedAt,
} as const;

// @FollowsBlueprint repository-query
export async function listVotesOfSetlist(setlistId: string): Promise<VoteRow[]> {
  const database = getDatabase();
  return await database
    .select(VOTE_PROJECTION)
    .from(setlistVoteTable)
    .where(eq(setlistVoteTable.setlistId, setlistId));
}

export async function listVotesOfMember(setlistId: string, memberId: string): Promise<VoteRow[]> {
  const database = getDatabase();
  return await database
    .select(VOTE_PROJECTION)
    .from(setlistVoteTable)
    .where(and(eq(setlistVoteTable.setlistId, setlistId), eq(setlistVoteTable.memberId, memberId)));
}

export async function upsertVote(values: {
  setlistId: string;
  memberId: string;
  songId: string;
  points: number;
  updatedAt: Date;
}): Promise<void> {
  const database = getDatabase();
  await database
    .insert(setlistVoteTable)
    .values(values)
    .onConflictDoUpdate({
      target: [setlistVoteTable.setlistId, setlistVoteTable.memberId, setlistVoteTable.songId],
      set: { points: values.points, updatedAt: values.updatedAt },
    });
}

export async function deleteVote(
  setlistId: string,
  memberId: string,
  songId: string,
): Promise<void> {
  const database = getDatabase();
  await database
    .delete(setlistVoteTable)
    .where(
      and(
        eq(setlistVoteTable.setlistId, setlistId),
        eq(setlistVoteTable.memberId, memberId),
        eq(setlistVoteTable.songId, songId),
      ),
    );
}

export async function deleteVotesOfMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await executor.delete(setlistVoteTable).where(eq(setlistVoteTable.memberId, memberId));
}

export async function deleteVotesOfSong(executor: DatabaseExecutor, songId: string): Promise<void> {
  await executor.delete(setlistVoteTable).where(eq(setlistVoteTable.songId, songId));
}

export async function replaceEntriesWithProposal(
  setlistId: string,
  songIds: readonly string[],
  status: string,
): Promise<void> {
  const database = getDatabase();
  await database.transaction(async (transaction) => {
    await transaction.delete(setlistEntryTable).where(eq(setlistEntryTable.setlistId, setlistId));
    if (songIds.length > 0) {
      await transaction.insert(setlistEntryTable).values(
        songIds.map((songId, position) => ({
          setlistId,
          songId,
          position,
        })),
      );
    }
    await transaction.update(setlistTable).set({ status }).where(eq(setlistTable.id, setlistId));
  });
}

export async function updateVoteStatus(
  setlistId: string,
  status: string,
  targetSongCount: number | null,
): Promise<number> {
  const database = getDatabase();
  const updated = await database
    .update(setlistTable)
    .set({ status, targetSongCount })
    .where(eq(setlistTable.id, setlistId))
    .returning({ id: setlistTable.id });
  return updated.length;
}
