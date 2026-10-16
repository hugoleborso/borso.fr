import { and, eq, sql } from 'drizzle-orm';
import { memoryCommitmentTable } from './memory-records.schema';
import type { MemoryExecutor } from './memory.repository';
import { memoryEntityTable, memoryFactTable, memoryRelationTable } from './memory.schema';

// @FollowsBlueprint repository-query
export async function findLastFactPosition(
  executor: MemoryExecutor,
  slug: string,
  section: string,
): Promise<number | null> {
  const rows = await executor
    .select({ position: sql<number | null>`max(${memoryFactTable.position})` })
    .from(memoryFactTable)
    .where(and(eq(memoryFactTable.entitySlug, slug), eq(memoryFactTable.section, section)));
  return rows[0]?.position ?? null;
}

export async function findLastRelationPosition(
  executor: MemoryExecutor,
  fromSlug: string,
): Promise<number | null> {
  const rows = await executor
    .select({ position: sql<number | null>`max(${memoryRelationTable.position})` })
    .from(memoryRelationTable)
    .where(eq(memoryRelationTable.fromSlug, fromSlug));
  return rows[0]?.position ?? null;
}

export async function countPagesWithSlug(executor: MemoryExecutor, slug: string): Promise<number> {
  const entities = await executor
    .select({ slug: memoryEntityTable.slug })
    .from(memoryEntityTable)
    .where(eq(memoryEntityTable.slug, slug));
  const commitments = await executor
    .select({ slug: memoryCommitmentTable.slug })
    .from(memoryCommitmentTable)
    .where(eq(memoryCommitmentTable.slug, slug));
  return entities.length + commitments.length;
}
