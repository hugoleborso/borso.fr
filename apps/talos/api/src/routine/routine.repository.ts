import { desc } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { routineRunTable } from './routine.schema';

export type RoutineRunRow = typeof routineRunTable.$inferSelect;

// @FollowsBlueprint repository-query
export async function insertRoutineRun(run: RoutineRunRow): Promise<void> {
  await getDatabase().insert(routineRunTable).values(run);
}

export async function listNewestRoutineRuns(limit: number): Promise<RoutineRunRow[]> {
  return await getDatabase()
    .select()
    .from(routineRunTable)
    .orderBy(desc(routineRunTable.firedAt))
    .limit(limit);
}
