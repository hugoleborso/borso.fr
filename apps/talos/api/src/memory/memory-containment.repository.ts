import { asc, inArray } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { memoryEntityTable, memoryFactTable, memoryRelationTable } from './memory.schema';

// @FollowsBlueprint repository-query
export async function listEntitiesIn(
  slugs: readonly string[],
): Promise<{ slug: string; kind: string; attributes: string }[]> {
  return await getDatabase()
    .select({
      slug: memoryEntityTable.slug,
      kind: memoryEntityTable.kind,
      attributes: memoryEntityTable.attributes,
    })
    .from(memoryEntityTable)
    .where(inArray(memoryEntityTable.slug, [...slugs]));
}

export async function listRelationsFrom(
  slugs: readonly string[],
): Promise<(typeof memoryRelationTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryRelationTable)
    .where(inArray(memoryRelationTable.fromSlug, [...slugs]))
    .orderBy(asc(memoryRelationTable.fromSlug), asc(memoryRelationTable.position));
}

export async function listFactsOfEntities(
  slugs: readonly string[],
): Promise<(typeof memoryFactTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryFactTable)
    .where(inArray(memoryFactTable.entitySlug, [...slugs]))
    .orderBy(asc(memoryFactTable.entitySlug), asc(memoryFactTable.position));
}
