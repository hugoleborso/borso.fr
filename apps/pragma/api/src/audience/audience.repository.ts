import { and, asc, desc, eq, gt, isNull } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  type InsertionOutcome,
  selectInsertionOutcome,
} from '../helpers/persistence/insertion.core';
import { audienceSuggestionTable, audienceVoteTable, votingRoundTable } from './audience.schema';

export interface VotingRoundRow {
  id: string;
  sessionId: string;
  openedAt: Date;
  closesAt: Date;
  settledAt: Date | null;
  winningSongId: string | null;
}

export interface AudienceVoteRow {
  ballotToken: string;
  songId: string;
  castAt: Date;
}

export interface RoundInsertShape {
  sessionId: string;
  openedAt: Date;
  closesAt: Date;
}

export interface VoteInsertShape {
  roundId: string;
  ballotToken: string;
  songId: string;
  castAt: Date;
}

export interface SuggestionInsertShape {
  sessionId: string;
  songId: string;
  ballotToken: string;
  suggestedAt: Date;
}

// @FollowsBlueprint repository-projection
const ROUND_PROJECTION = {
  id: votingRoundTable.id,
  sessionId: votingRoundTable.sessionId,
  openedAt: votingRoundTable.openedAt,
  closesAt: votingRoundTable.closesAt,
  settledAt: votingRoundTable.settledAt,
  winningSongId: votingRoundTable.winningSongId,
} as const;

// @FollowsBlueprint repository-projection
const VOTE_PROJECTION = {
  ballotToken: audienceVoteTable.ballotToken,
  songId: audienceVoteTable.songId,
  castAt: audienceVoteTable.castAt,
} as const;

// @FollowsBlueprint repository-query
export async function insertRound(values: RoundInsertShape): Promise<VotingRoundRow> {
  const [row] = await getDatabase()
    .insert(votingRoundTable)
    .values(values)
    .returning(ROUND_PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

// @FollowsBlueprint repository-query
export async function findOpenRoundOfConcert(
  sessionId: string,
  now: Date,
): Promise<VotingRoundRow | null> {
  const rows = await getDatabase()
    .select(ROUND_PROJECTION)
    .from(votingRoundTable)
    .where(
      and(
        eq(votingRoundTable.sessionId, sessionId),
        isNull(votingRoundTable.settledAt),
        gt(votingRoundTable.closesAt, now),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

// @FollowsBlueprint repository-query
export async function findLatestRoundOfConcert(sessionId: string): Promise<VotingRoundRow | null> {
  const rows = await getDatabase()
    .select(ROUND_PROJECTION)
    .from(votingRoundTable)
    .where(eq(votingRoundTable.sessionId, sessionId))
    .orderBy(desc(votingRoundTable.openedAt))
    .limit(1);
  return rows[0] ?? null;
}

// @FollowsBlueprint repository-query
export async function findRoundById(roundId: string): Promise<VotingRoundRow | null> {
  const rows = await getDatabase()
    .select(ROUND_PROJECTION)
    .from(votingRoundTable)
    .where(eq(votingRoundTable.id, roundId))
    .limit(1);
  return rows[0] ?? null;
}

// @FollowsBlueprint repository-query
export async function listRoundsOfConcert(sessionId: string): Promise<VotingRoundRow[]> {
  return await getDatabase()
    .select(ROUND_PROJECTION)
    .from(votingRoundTable)
    .where(eq(votingRoundTable.sessionId, sessionId))
    .orderBy(asc(votingRoundTable.openedAt));
}

// @FollowsBlueprint repository-query
export async function findConcertWithOpenRound(now: Date): Promise<string | null> {
  const rows = await getDatabase()
    .select({ sessionId: votingRoundTable.sessionId })
    .from(votingRoundTable)
    .where(and(isNull(votingRoundTable.settledAt), gt(votingRoundTable.closesAt, now)))
    .orderBy(desc(votingRoundTable.openedAt))
    .limit(1);
  return rows[0]?.sessionId ?? null;
}

// @FollowsBlueprint repository-query
export async function listWinningSongIdsOfConcert(sessionId: string): Promise<string[]> {
  const rows = await getDatabase()
    .select({ winningSongId: votingRoundTable.winningSongId })
    .from(votingRoundTable)
    .where(eq(votingRoundTable.sessionId, sessionId));
  return rows.flatMap((row) => (row.winningSongId === null ? [] : [row.winningSongId]));
}

/**
 * @Blueprint repository-conditional-claim
 * @BlueprintName Repository Conditional Claim
 * @BlueprintUsage Use when several concurrent callers can reach the same one-off write and exactly one of them must do the work that follows.
 * @BlueprintDescription Narrows the `UPDATE` with the predicate that describes the unclaimed state and returns whether a row came back, so the claim and the test are one statement rather than a read followed by a write two callers can interleave. It takes the executor as a required argument, which is what lets the caller put the claim and the work it authorises in one transaction; on Aurora DSQL the loser is aborted at commit rather than blocked, so the caller must also treat a serialization failure as a lost claim.
 */
export async function hasClaimedRoundForSettlement(
  executor: DatabaseExecutor,
  roundId: string,
  settledAt: Date,
  winningSongId: string | null,
): Promise<boolean> {
  const claimed = await executor
    .update(votingRoundTable)
    .set({ settledAt, winningSongId })
    .where(and(eq(votingRoundTable.id, roundId), isNull(votingRoundTable.settledAt)))
    .returning({ id: votingRoundTable.id });
  return claimed.length > 0;
}

// @FollowsBlueprint repository-query
export async function listVotesOfRound(roundId: string): Promise<AudienceVoteRow[]> {
  return await getDatabase()
    .select(VOTE_PROJECTION)
    .from(audienceVoteTable)
    .where(eq(audienceVoteTable.roundId, roundId))
    .orderBy(asc(audienceVoteTable.castAt));
}

// @FollowsBlueprint repository-query
export async function recordVote(values: VoteInsertShape): Promise<InsertionOutcome> {
  const written = await getDatabase()
    .insert(audienceVoteTable)
    .values(values)
    .onConflictDoNothing()
    .returning({ songId: audienceVoteTable.songId });
  return selectInsertionOutcome(written.length);
}

// @FollowsBlueprint repository-query
export async function deleteVote(
  roundId: string,
  ballotToken: string,
  songId: string,
): Promise<DeletionOutcome> {
  const deleted = await getDatabase()
    .delete(audienceVoteTable)
    .where(
      and(
        eq(audienceVoteTable.roundId, roundId),
        eq(audienceVoteTable.ballotToken, ballotToken),
        eq(audienceVoteTable.songId, songId),
      ),
    )
    .returning({ songId: audienceVoteTable.songId });
  return selectDeletionOutcome(deleted.length);
}

// @FollowsBlueprint repository-query
export async function listSuggestedSongIdsOfConcert(sessionId: string): Promise<string[]> {
  const rows = await getDatabase()
    .select({ songId: audienceSuggestionTable.songId })
    .from(audienceSuggestionTable)
    .where(eq(audienceSuggestionTable.sessionId, sessionId));
  return rows.map((row) => row.songId);
}

// @FollowsBlueprint repository-query
export async function insertSuggestion(values: SuggestionInsertShape): Promise<void> {
  await getDatabase().insert(audienceSuggestionTable).values(values);
}
