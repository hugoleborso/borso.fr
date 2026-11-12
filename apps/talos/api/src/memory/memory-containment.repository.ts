import { and, asc, desc, gte, inArray, like, sql } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { memoryEntityTable, memoryFactTable, memoryRelationTable } from './memory.schema';

const ISO_DAY_LIKE = '____-__-__';
const DIGITS = '0123456789';
const ISO_DAY_WITHOUT_DIGITS = '--';

// @FollowsBlueprint repository-query
export async function listEntitiesIn(
  slugs: readonly string[],
): Promise<Pick<typeof memoryEntityTable.$inferSelect, 'slug' | 'kind' | 'attributes'>[]> {
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

export async function listRecentFactsOfEntities(
  slugs: readonly string[],
  learnedSince: string,
  limit: number,
): Promise<(typeof memoryFactTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryFactTable)
    .where(
      and(
        inArray(memoryFactTable.entitySlug, [...slugs]),
        like(memoryFactTable.learnedOn, ISO_DAY_LIKE),
        sql`translate(${memoryFactTable.learnedOn}, ${DIGITS}, '') = ${ISO_DAY_WITHOUT_DIGITS}`,
        gte(memoryFactTable.learnedOn, learnedSince),
      ),
    )
    .orderBy(
      desc(memoryFactTable.learnedOn),
      asc(memoryFactTable.entitySlug),
      asc(memoryFactTable.position),
    )
    .limit(limit);
}
