/**
 * Data access for the shelves context, and the only file in it that imports
 * the database client.
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { shelfTable } from './shelves.schema';

export interface ShelfRow {
  readonly id: string;
  readonly name: string;
}

// @FollowsBlueprint repository-projection
const PROJECTION = {
  id: shelfTable.id,
  name: shelfTable.name,
} as const;

// @FollowsBlueprint repository-query
export async function listShelves(): Promise<ShelfRow[]> {
  const database = getDatabase();
  return await database.select(PROJECTION).from(shelfTable);
}

export async function findShelfById(id: string): Promise<ShelfRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(PROJECTION)
    .from(shelfTable)
    .where(eq(shelfTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertShelf(name: string): Promise<ShelfRow> {
  const database = getDatabase();
  const [row] = await database.insert(shelfTable).values({ name }).returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function updateShelfName(id: string, name: string): Promise<ShelfRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(shelfTable)
    .set({ name })
    .where(eq(shelfTable.id, id))
    .returning(PROJECTION);
  return row ?? null;
}

export async function deleteShelf(id: string): Promise<number> {
  const database = getDatabase();
  const deleted = await database
    .delete(shelfTable)
    .where(eq(shelfTable.id, id))
    .returning({ id: shelfTable.id });
  return deleted.length;
}
