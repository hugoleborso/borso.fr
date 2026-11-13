import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { songTable } from '../songs/songs.schema';
import { sketchClipTable, sketchLaneTable } from './sketches.schema';
import type { SketchClipPlacement, SketchClipRow, SketchLaneRow } from './sketches.types';

const LANE_PROJECTION = {
  id: sketchLaneTable.id,
  songId: sketchLaneTable.songId,
  name: sketchLaneTable.name,
  position: sketchLaneTable.position,
} as const;

// @FollowsBlueprint repository-projection
const CLIP_PROJECTION = {
  id: sketchClipTable.id,
  laneId: sketchClipTable.laneId,
  inspirationId: sketchClipTable.inspirationId,
  offsetSeconds: sketchClipTable.offsetSeconds,
} as const;

function selectLaneIdsOfSong(executor: DatabaseExecutor, songId: string) {
  return executor
    .select({ id: sketchLaneTable.id })
    .from(sketchLaneTable)
    .where(eq(sketchLaneTable.songId, songId));
}

// @FollowsBlueprint repository-owned-transaction
export async function runInOneSketchTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await getDatabase().transaction(work);
}

export async function hasSong(songId: string): Promise<boolean> {
  const [song] = await getDatabase()
    .select({ id: songTable.id })
    .from(songTable)
    .where(eq(songTable.id, songId))
    .limit(1);
  return song !== undefined;
}

export async function listLanesOfSong(songId: string): Promise<SketchLaneRow[]> {
  return await getDatabase()
    .select(LANE_PROJECTION)
    .from(sketchLaneTable)
    .where(eq(sketchLaneTable.songId, songId))
    .orderBy(asc(sketchLaneTable.position), asc(sketchLaneTable.id));
}

export async function listClipsOfSong(songId: string): Promise<SketchClipRow[]> {
  return await getDatabase()
    .select(CLIP_PROJECTION)
    .from(sketchClipTable)
    .innerJoin(sketchLaneTable, eq(sketchLaneTable.id, sketchClipTable.laneId))
    .where(eq(sketchLaneTable.songId, songId))
    .orderBy(asc(sketchClipTable.offsetSeconds), asc(sketchClipTable.id));
}

// @FollowsBlueprint repository-conditional-claim
export async function didClaimSketchSongWithin(
  executor: DatabaseExecutor,
  songId: string,
): Promise<boolean> {
  const claimed = await executor
    .update(songTable)
    .set({ title: sql`${songTable.title}` })
    .where(eq(songTable.id, songId))
    .returning({ id: songTable.id });
  return claimed.length > 0;
}

export async function didClaimLaneOfSongWithin(
  executor: DatabaseExecutor,
  songId: string,
  laneId: string,
): Promise<boolean> {
  const claimed = await executor
    .update(sketchLaneTable)
    .set({ name: sql`${sketchLaneTable.name}` })
    .where(and(eq(sketchLaneTable.id, laneId), eq(sketchLaneTable.songId, songId)))
    .returning({ id: sketchLaneTable.id });
  return claimed.length > 0;
}

// @FollowsBlueprint repository-idempotent-upsert
export async function insertLaneUnlessPresentWithin(
  executor: DatabaseExecutor,
  lane: SketchLaneRow,
): Promise<void> {
  await executor.insert(sketchLaneTable).values(lane).onConflictDoNothing();
}

export async function findLaneOfSongWithin(
  executor: DatabaseExecutor,
  songId: string,
  laneId: string,
): Promise<SketchLaneRow | null> {
  const [lane] = await executor
    .select(LANE_PROJECTION)
    .from(sketchLaneTable)
    .where(and(eq(sketchLaneTable.id, laneId), eq(sketchLaneTable.songId, songId)))
    .limit(1);
  return lane ?? null;
}

export async function findRenamedLane(
  songId: string,
  laneId: string,
  name: string,
): Promise<SketchLaneRow | null> {
  const [lane] = await getDatabase()
    .update(sketchLaneTable)
    .set({ name })
    .where(and(eq(sketchLaneTable.id, laneId), eq(sketchLaneTable.songId, songId)))
    .returning(LANE_PROJECTION);
  return lane ?? null;
}

export async function didDeleteLaneWithClips(songId: string, laneId: string): Promise<boolean> {
  return await runInOneSketchTransaction(async (transaction) => {
    const deleted = await transaction
      .delete(sketchLaneTable)
      .where(and(eq(sketchLaneTable.id, laneId), eq(sketchLaneTable.songId, songId)))
      .returning({ id: sketchLaneTable.id });
    await transaction.delete(sketchClipTable).where(eq(sketchClipTable.laneId, laneId));
    return deleted.length > 0;
  });
}

// @FollowsBlueprint repository-idempotent-upsert
export async function hasInsertedClipWithin(
  executor: DatabaseExecutor,
  clip: SketchClipRow,
): Promise<boolean> {
  const inserted = await executor
    .insert(sketchClipTable)
    .values(clip)
    .onConflictDoNothing()
    .returning({ id: sketchClipTable.id });
  return inserted.length > 0;
}

export async function findClipWithin(
  executor: DatabaseExecutor,
  clipId: string,
): Promise<SketchClipRow | null> {
  const [clip] = await executor
    .select(CLIP_PROJECTION)
    .from(sketchClipTable)
    .where(eq(sketchClipTable.id, clipId))
    .limit(1);
  return clip ?? null;
}

export async function findMovedClipWithin(
  executor: DatabaseExecutor,
  songId: string,
  clip: SketchClipPlacement,
): Promise<SketchClipRow | null> {
  const [moved] = await executor
    .update(sketchClipTable)
    .set({ laneId: clip.laneId, offsetSeconds: clip.offsetSeconds })
    .where(
      and(
        eq(sketchClipTable.id, clip.id),
        inArray(sketchClipTable.laneId, selectLaneIdsOfSong(executor, songId)),
      ),
    )
    .returning(CLIP_PROJECTION);
  return moved ?? null;
}

export async function didDeleteClip(songId: string, clipId: string): Promise<boolean> {
  const database = getDatabase();
  const deleted = await database
    .delete(sketchClipTable)
    .where(
      and(
        eq(sketchClipTable.id, clipId),
        inArray(sketchClipTable.laneId, selectLaneIdsOfSong(database, songId)),
      ),
    )
    .returning({ id: sketchClipTable.id });
  return deleted.length > 0;
}

export async function deleteLanesAndClipsOfSongWithin(
  executor: DatabaseExecutor,
  songId: string,
): Promise<void> {
  const deletedLanes = await executor
    .delete(sketchLaneTable)
    .where(eq(sketchLaneTable.songId, songId))
    .returning({ id: sketchLaneTable.id });
  if (deletedLanes.length === 0) return;
  await executor.delete(sketchClipTable).where(
    inArray(
      sketchClipTable.laneId,
      deletedLanes.map((lane) => lane.id),
    ),
  );
}
