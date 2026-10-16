import { asc, eq, inArray } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import {
  memoryDraftTable,
  memoryJournalEntryTable,
  memoryProposalTable,
  memoryTodoTable,
} from './memory-records.schema';

// @FollowsBlueprint repository-query
export async function listProposals(): Promise<(typeof memoryProposalTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryProposalTable)
    .orderBy(asc(memoryProposalTable.slug));
}

export async function listDrafts(): Promise<(typeof memoryDraftTable.$inferSelect)[]> {
  return await getDatabase().select().from(memoryDraftTable).orderBy(asc(memoryDraftTable.slug));
}

export async function listJournalSlugs(): Promise<string[]> {
  const rows = await getDatabase()
    .select({ slug: memoryJournalEntryTable.slug })
    .from(memoryJournalEntryTable)
    .orderBy(asc(memoryJournalEntryTable.slug));
  return rows.map((row) => row.slug);
}

export async function listJournalEntriesIn(
  slugs: readonly string[],
): Promise<(typeof memoryJournalEntryTable.$inferSelect)[]> {
  if (slugs.length === 0) return [];
  return await getDatabase()
    .select()
    .from(memoryJournalEntryTable)
    .where(inArray(memoryJournalEntryTable.slug, [...slugs]));
}

export async function listTodosOf(list: string): Promise<(typeof memoryTodoTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryTodoTable)
    .where(eq(memoryTodoTable.list, list))
    .orderBy(asc(memoryTodoTable.position));
}
