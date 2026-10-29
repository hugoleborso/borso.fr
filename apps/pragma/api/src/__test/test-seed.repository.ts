import { sql } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import * as schema from '../database/schema';
import { assistantClientTable, assistantGrantTable } from '../oauth/oauth.schema';
import { PRODUCTION_SCHEMA, readErrorCode } from './schema-boundary.core';

const TABLES_THE_SEED_KEEPS: ReadonlySet<unknown> = new Set([
  schema.appConfigTable,
  schema.vapidKeyPairTable,
  schema.authAttemptTable,
]);

// @FollowsBlueprint repository-query
export async function deleteAllDomainRows(): Promise<void> {
  const database = getDatabase();
  const domainTables = Object.values(schema).filter((table) => !TABLES_THE_SEED_KEEPS.has(table));
  await Promise.all(domainTables.map((table) => database.delete(table)));
}

export interface SeedAssistantGrantRows {
  readonly client: typeof assistantClientTable.$inferInsert;
  readonly grant: typeof assistantGrantTable.$inferInsert;
}

export async function insertSeedAssistantGrant(rows: SeedAssistantGrantRows): Promise<void> {
  const database = getDatabase();
  await database.insert(assistantClientTable).values(rows.client);
  await database.insert(assistantGrantTable).values(rows.grant);
}

export async function tryReadingProductionMembers(): Promise<string | null> {
  const database = getDatabase();
  try {
    await database.execute(sql.raw(`SELECT 1 FROM "${PRODUCTION_SCHEMA}"."member" LIMIT 1`));
    return null;
  } catch (error) {
    return readErrorCode(error) || readErrorCode(Reflect.get(Object(error), 'cause'));
  }
}
