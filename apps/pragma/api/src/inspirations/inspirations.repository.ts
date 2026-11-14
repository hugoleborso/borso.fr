import { desc, eq, sql } from 'drizzle-orm';
import { compositionTable } from '../compositions/compositions.schema';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { memberTable } from '../members/members.schema';
import { sketchClipTable, sketchLaneTable } from '../sketches/sketches.schema';
import { inspirationTable } from './inspirations.schema';
import type {
  InspirationChanges,
  InspirationInsert,
  InspirationRow,
  InspirationUsage,
} from './inspirations.types';

// @FollowsBlueprint repository-projection
const INSPIRATION_PROJECTION = {
  id: inspirationTable.id,
  youtubeVideoId: inspirationTable.youtubeVideoId,
  title: inspirationTable.title,
  artist: inspirationTable.artist,
  deezerTrackId: inspirationTable.deezerTrackId,
  deezerAlbumId: inspirationTable.deezerAlbumId,
  startSeconds: inspirationTable.startSeconds,
  endSeconds: inspirationTable.endSeconds,
  note: inspirationTable.note,
  authorMemberId: inspirationTable.authorMemberId,
  authorName: memberTable.firstName,
  createdAt: inspirationTable.createdAt,
} as const;

const USAGE_PROJECTION = {
  inspirationId: sketchClipTable.inspirationId,
  compositionId: sketchLaneTable.compositionId,
  compositionTitle: compositionTable.title,
} as const;

function selectInspirations(executor: DatabaseExecutor) {
  return executor
    .select(INSPIRATION_PROJECTION)
    .from(inspirationTable)
    .leftJoin(memberTable, eq(memberTable.id, inspirationTable.authorMemberId));
}

function selectUsages(executor: DatabaseExecutor) {
  return executor
    .select(USAGE_PROJECTION)
    .from(sketchClipTable)
    .innerJoin(sketchLaneTable, eq(sketchLaneTable.id, sketchClipTable.laneId))
    .innerJoin(compositionTable, eq(compositionTable.id, sketchLaneTable.compositionId));
}

// @FollowsBlueprint repository-owned-transaction
export async function runInOneInspirationTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await getDatabase().transaction(work);
}

export async function listInspirationsNewestFirst(): Promise<InspirationRow[]> {
  return await selectInspirations(getDatabase()).orderBy(
    desc(inspirationTable.createdAt),
    desc(inspirationTable.id),
  );
}

export async function listInspirationUsages(): Promise<InspirationUsage[]> {
  return await selectUsages(getDatabase());
}

export async function listUsagesOfInspirationWithin(
  executor: DatabaseExecutor,
  inspirationId: string,
): Promise<InspirationUsage[]> {
  return await selectUsages(executor).where(eq(sketchClipTable.inspirationId, inspirationId));
}

// @FollowsBlueprint repository-idempotent-upsert
export async function hasInsertedInspirationWithin(
  executor: DatabaseExecutor,
  inspiration: InspirationInsert,
): Promise<boolean> {
  const inserted = await executor
    .insert(inspirationTable)
    .values(inspiration)
    .onConflictDoNothing()
    .returning({ id: inspirationTable.id });
  return inserted.length > 0;
}

export async function findWrittenInspirationWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<InspirationRow | null> {
  const [row] = await selectInspirations(executor).where(eq(inspirationTable.id, id)).limit(1);
  return row ?? null;
}

export async function didUpdateInspirationWithin(
  executor: DatabaseExecutor,
  id: string,
  changes: InspirationChanges,
): Promise<boolean> {
  const updated = await executor
    .update(inspirationTable)
    .set(changes)
    .where(eq(inspirationTable.id, id))
    .returning({ id: inspirationTable.id });
  return updated.length > 0;
}

// @FollowsBlueprint repository-conditional-claim
export async function didClaimInspirationRowWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<boolean> {
  const claimed = await executor
    .update(inspirationTable)
    .set({ title: sql`${inspirationTable.title}` })
    .where(eq(inspirationTable.id, id))
    .returning({ id: inspirationTable.id });
  return claimed.length > 0;
}

export async function deleteInspirationWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<void> {
  await executor.delete(inspirationTable).where(eq(inspirationTable.id, id));
}

export async function detachInspirationsOfMemberWithin(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await executor
    .update(inspirationTable)
    .set({ authorMemberId: null })
    .where(eq(inspirationTable.authorMemberId, memberId));
}
