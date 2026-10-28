import { asc, count, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import {
  memoryChangeBatchTable,
  memoryCommitmentTable,
  memoryDocumentTable,
  memoryDraftTable,
  memoryEventTable,
  memoryFocusItemTable,
  memoryJournalEntryTable,
  memoryProposalTable,
  memoryStateTable,
  memoryTodoTable,
} from './memory-records.schema';
import {
  memoryAliasTable,
  memoryCitationTable,
  memoryEntityTable,
  memoryFactTable,
  memoryRelationTable,
  memorySourceTable,
  memoryVerbTable,
} from './memory.schema';

export type MemoryDatabase = ReturnType<typeof getDatabase>;
export type MemoryExecutor =
  | MemoryDatabase
  | Parameters<Parameters<MemoryDatabase['transaction']>[0]>[0];

export const MEMORY_TABLES = {
  memory_entity: memoryEntityTable,
  memory_alias: memoryAliasTable,
  memory_fact: memoryFactTable,
  memory_relation: memoryRelationTable,
  memory_verb: memoryVerbTable,
  memory_source: memorySourceTable,
  memory_citation: memoryCitationTable,
  memory_commitment: memoryCommitmentTable,
  memory_todo: memoryTodoTable,
  memory_focus_item: memoryFocusItemTable,
  memory_proposal: memoryProposalTable,
  memory_draft: memoryDraftTable,
  memory_journal_entry: memoryJournalEntryTable,
  memory_document: memoryDocumentTable,
  memory_state: memoryStateTable,
  memory_event: memoryEventTable,
  memory_change_batch: memoryChangeBatchTable,
} as const;

export type MemoryTableName = keyof typeof MEMORY_TABLES;

// @FollowsBlueprint repository-query
export async function findEntity(
  executor: MemoryExecutor,
  slug: string,
): Promise<typeof memoryEntityTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memoryEntityTable)
    .where(eq(memoryEntityTable.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function listEntities(): Promise<(typeof memoryEntityTable.$inferSelect)[]> {
  return await getDatabase().select().from(memoryEntityTable).orderBy(asc(memoryEntityTable.slug));
}

export async function listFactsOf(slug: string): Promise<(typeof memoryFactTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryFactTable)
    .where(eq(memoryFactTable.entitySlug, slug))
    .orderBy(asc(memoryFactTable.position));
}

export async function findFact(
  executor: MemoryExecutor,
  id: string,
): Promise<typeof memoryFactTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memoryFactTable)
    .where(eq(memoryFactTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findRelation(
  executor: MemoryExecutor,
  id: string,
): Promise<typeof memoryRelationTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memoryRelationTable)
    .where(eq(memoryRelationTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listRelations(): Promise<(typeof memoryRelationTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryRelationTable)
    .orderBy(asc(memoryRelationTable.fromSlug), asc(memoryRelationTable.position));
}

export async function listRelationsTouching(
  slug: string,
): Promise<(typeof memoryRelationTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryRelationTable)
    .where(or(eq(memoryRelationTable.fromSlug, slug), eq(memoryRelationTable.toSlug, slug)))
    .orderBy(asc(memoryRelationTable.position));
}

export async function findVerb(
  executor: MemoryExecutor,
  name: string,
): Promise<typeof memoryVerbTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memoryVerbTable)
    .where(eq(memoryVerbTable.name, name))
    .limit(1);
  return rows[0] ?? null;
}

export async function listVerbs(): Promise<(typeof memoryVerbTable.$inferSelect)[]> {
  return await getDatabase().select().from(memoryVerbTable);
}

export async function findSource(
  executor: MemoryExecutor,
  slug: string,
): Promise<typeof memorySourceTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memorySourceTable)
    .where(eq(memorySourceTable.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function findCommitment(
  executor: MemoryExecutor,
  slug: string,
): Promise<typeof memoryCommitmentTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memoryCommitmentTable)
    .where(eq(memoryCommitmentTable.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function listCommitments(): Promise<(typeof memoryCommitmentTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryCommitmentTable)
    .orderBy(asc(memoryCommitmentTable.slug));
}

export async function findTodo(
  executor: MemoryExecutor,
  id: string,
): Promise<typeof memoryTodoTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memoryTodoTable)
    .where(eq(memoryTodoTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listTodos(): Promise<(typeof memoryTodoTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryTodoTable)
    .orderBy(asc(memoryTodoTable.list), asc(memoryTodoTable.position));
}

export async function findLastTodoPosition(
  executor: MemoryExecutor,
  list: string,
): Promise<number | null> {
  const rows = await executor
    .select({ position: sql<number | null>`max(${memoryTodoTable.position})` })
    .from(memoryTodoTable)
    .where(eq(memoryTodoTable.list, list));
  return rows[0]?.position ?? null;
}

export async function listFocusItems(): Promise<(typeof memoryFocusItemTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryFocusItemTable)
    .orderBy(asc(memoryFocusItemTable.rank));
}

export async function findProposal(
  executor: MemoryExecutor,
  slug: string,
): Promise<typeof memoryProposalTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memoryProposalTable)
    .where(eq(memoryProposalTable.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function findDraft(
  executor: MemoryExecutor,
  slug: string,
): Promise<typeof memoryDraftTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memoryDraftTable)
    .where(eq(memoryDraftTable.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function findJournalEntry(
  executor: MemoryExecutor,
  slug: string,
): Promise<typeof memoryJournalEntryTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memoryJournalEntryTable)
    .where(eq(memoryJournalEntryTable.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function findDocument(
  executor: MemoryExecutor,
  slug: string,
): Promise<typeof memoryDocumentTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memoryDocumentTable)
    .where(eq(memoryDocumentTable.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function listDocumentsUnder(
  prefix: string,
): Promise<(typeof memoryDocumentTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryDocumentTable)
    .where(like(memoryDocumentTable.slug, `${prefix}%`))
    .orderBy(asc(memoryDocumentTable.slug));
}

export async function findState(
  executor: MemoryExecutor,
  key: string,
): Promise<typeof memoryStateTable.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(memoryStateTable)
    .where(eq(memoryStateTable.key, key))
    .limit(1);
  return rows[0] ?? null;
}

export async function listStates(
  keys: readonly string[],
): Promise<(typeof memoryStateTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryStateTable)
    .where(inArray(memoryStateTable.key, [...keys]));
}

export async function listRecentEvents(
  limit: number,
): Promise<(typeof memoryEventTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryEventTable)
    .orderBy(desc(memoryEventTable.occurredAt))
    .limit(limit);
}

export async function findChangeBatch(
  idempotencyKey: string,
): Promise<typeof memoryChangeBatchTable.$inferSelect | null> {
  const rows = await getDatabase()
    .select()
    .from(memoryChangeBatchTable)
    .where(eq(memoryChangeBatchTable.idempotencyKey, idempotencyKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function countTableRows(tableName: MemoryTableName): Promise<number> {
  const rows = await getDatabase().select({ total: count() }).from(MEMORY_TABLES[tableName]);
  return rows[0]?.total ?? 0;
}

export async function listTableRows(tableName: MemoryTableName): Promise<unknown[]> {
  return await getDatabase().select().from(MEMORY_TABLES[tableName]);
}

export async function listSlugsLinkingTo(slug: string): Promise<string[]> {
  const needle = `%[[${slug}%`;
  const rows = await getDatabase()
    .select({ slug: memoryEntityTable.slug })
    .from(memoryEntityTable)
    .where(like(memoryEntityTable.body, needle));
  return rows.map((row) => row.slug);
}
