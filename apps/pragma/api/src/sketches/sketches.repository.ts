import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { compositionTable } from '../compositions/compositions.schema';
import { sketchClipTable, sketchLaneTable } from './sketches.schema';
import type {
  SketchClipPlacement,
  SketchClipRow,
  SketchComposition,
  SketchLaneRow,
} from './sketches.types';

const LANE_PROJECTION = {
  id: sketchLaneTable.id,
  compositionId: sketchLaneTable.compositionId,
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

function selectLaneIdsOfComposition(executor: DatabaseExecutor, compositionId: string) {
  return executor
    .select({ id: sketchLaneTable.id })
    .from(sketchLaneTable)
    .where(eq(sketchLaneTable.compositionId, compositionId));
}

// @FollowsBlueprint repository-owned-transaction
export async function runInOneSketchTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await getDatabase().transaction(work);
}

export async function findSketchComposition(
  compositionId: string,
): Promise<SketchComposition | null> {
  const [composition] = await getDatabase()
    .select({
      id: compositionTable.id,
      title: compositionTable.title,
      songId: compositionTable.songId,
      createdAt: compositionTable.createdAt,
    })
    .from(compositionTable)
    .where(eq(compositionTable.id, compositionId))
    .limit(1);
  return composition ?? null;
}

export async function listLanesOfComposition(compositionId: string): Promise<SketchLaneRow[]> {
  return await getDatabase()
    .select(LANE_PROJECTION)
    .from(sketchLaneTable)
    .where(eq(sketchLaneTable.compositionId, compositionId))
    .orderBy(asc(sketchLaneTable.position), asc(sketchLaneTable.id));
}

export async function listClipsOfComposition(compositionId: string): Promise<SketchClipRow[]> {
  return await getDatabase()
    .select(CLIP_PROJECTION)
    .from(sketchClipTable)
    .innerJoin(sketchLaneTable, eq(sketchLaneTable.id, sketchClipTable.laneId))
    .where(eq(sketchLaneTable.compositionId, compositionId))
    .orderBy(asc(sketchClipTable.offsetSeconds), asc(sketchClipTable.id));
}

// @FollowsBlueprint repository-conditional-claim
export async function didClaimSketchCompositionWithin(
  executor: DatabaseExecutor,
  compositionId: string,
): Promise<boolean> {
  const claimed = await executor
    .update(compositionTable)
    .set({ title: sql`${compositionTable.title}` })
    .where(eq(compositionTable.id, compositionId))
    .returning({ id: compositionTable.id });
  return claimed.length > 0;
}

export async function didClaimLaneOfCompositionWithin(
  executor: DatabaseExecutor,
  compositionId: string,
  laneId: string,
): Promise<boolean> {
  const claimed = await executor
    .update(sketchLaneTable)
    .set({ name: sql`${sketchLaneTable.name}` })
    .where(and(eq(sketchLaneTable.id, laneId), eq(sketchLaneTable.compositionId, compositionId)))
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

export async function findLaneOfCompositionWithin(
  executor: DatabaseExecutor,
  compositionId: string,
  laneId: string,
): Promise<SketchLaneRow | null> {
  const [lane] = await executor
    .select(LANE_PROJECTION)
    .from(sketchLaneTable)
    .where(and(eq(sketchLaneTable.id, laneId), eq(sketchLaneTable.compositionId, compositionId)))
    .limit(1);
  return lane ?? null;
}

export async function findRenamedLane(
  compositionId: string,
  laneId: string,
  name: string,
): Promise<SketchLaneRow | null> {
  const [lane] = await getDatabase()
    .update(sketchLaneTable)
    .set({ name })
    .where(and(eq(sketchLaneTable.id, laneId), eq(sketchLaneTable.compositionId, compositionId)))
    .returning(LANE_PROJECTION);
  return lane ?? null;
}

export async function didDeleteLaneWithClips(
  compositionId: string,
  laneId: string,
): Promise<boolean> {
  return await runInOneSketchTransaction(async (transaction) => {
    const deleted = await transaction
      .delete(sketchLaneTable)
      .where(and(eq(sketchLaneTable.id, laneId), eq(sketchLaneTable.compositionId, compositionId)))
      .returning({ id: sketchLaneTable.id });
    if (deleted.length === 0) return false;
    await transaction.delete(sketchClipTable).where(eq(sketchClipTable.laneId, laneId));
    return true;
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

export async function findClipOfCompositionWithin(
  executor: DatabaseExecutor,
  compositionId: string,
  clipId: string,
): Promise<SketchClipRow | null> {
  const [clip] = await executor
    .select(CLIP_PROJECTION)
    .from(sketchClipTable)
    .innerJoin(sketchLaneTable, eq(sketchLaneTable.id, sketchClipTable.laneId))
    .where(and(eq(sketchClipTable.id, clipId), eq(sketchLaneTable.compositionId, compositionId)))
    .limit(1);
  return clip ?? null;
}

export async function findMovedClipWithin(
  executor: DatabaseExecutor,
  compositionId: string,
  clip: SketchClipPlacement,
): Promise<SketchClipRow | null> {
  const [moved] = await executor
    .update(sketchClipTable)
    .set({ laneId: clip.laneId, offsetSeconds: clip.offsetSeconds })
    .where(
      and(
        eq(sketchClipTable.id, clip.id),
        inArray(sketchClipTable.laneId, selectLaneIdsOfComposition(executor, compositionId)),
      ),
    )
    .returning(CLIP_PROJECTION);
  return moved ?? null;
}

export async function didDeleteClip(compositionId: string, clipId: string): Promise<boolean> {
  const database = getDatabase();
  const deleted = await database
    .delete(sketchClipTable)
    .where(
      and(
        eq(sketchClipTable.id, clipId),
        inArray(sketchClipTable.laneId, selectLaneIdsOfComposition(database, compositionId)),
      ),
    )
    .returning({ id: sketchClipTable.id });
  return deleted.length > 0;
}

export async function deleteLanesAndClipsOfCompositionWithin(
  executor: DatabaseExecutor,
  compositionId: string,
): Promise<void> {
  const deletedLanes = await executor
    .delete(sketchLaneTable)
    .where(eq(sketchLaneTable.compositionId, compositionId))
    .returning({ id: sketchLaneTable.id });
  if (deletedLanes.length === 0) return;
  await executor.delete(sketchClipTable).where(
    inArray(
      sketchClipTable.laneId,
      deletedLanes.map((lane) => lane.id),
    ),
  );
}
