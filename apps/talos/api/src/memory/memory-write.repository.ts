import { eq, like, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
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
import type { MemoryExecutor } from './memory.repository';
import {
  memoryAliasTable,
  memoryCitationTable,
  memoryEntityTable,
  memoryFactTable,
  memoryRelationTable,
  memorySourceTable,
  memoryVerbTable,
} from './memory.schema';

type EntityInsert = typeof memoryEntityTable.$inferInsert;
type FactInsert = typeof memoryFactTable.$inferInsert;
type RelationInsert = typeof memoryRelationTable.$inferInsert;

// @FollowsBlueprint repository-owned-transaction
export async function runInMemoryTransaction<Outcome>(
  work: (executor: MemoryExecutor) => Promise<Outcome>,
): Promise<Outcome> {
  return await getDatabase().transaction(work);
}

export async function upsertEntity(executor: MemoryExecutor, values: EntityInsert): Promise<void> {
  const { slug: _slug, createdAt: _createdAt, ...changes } = values;
  await executor
    .insert(memoryEntityTable)
    .values(values)
    .onConflictDoUpdate({ target: memoryEntityTable.slug, set: changes });
}

export async function insertEntity(executor: MemoryExecutor, values: EntityInsert): Promise<void> {
  await executor.insert(memoryEntityTable).values(values);
}

export async function updateEntity(
  executor: MemoryExecutor,
  slug: string,
  values: Partial<EntityInsert>,
): Promise<void> {
  await executor.update(memoryEntityTable).set(values).where(eq(memoryEntityTable.slug, slug));
}

export async function didInsertAlias(
  executor: MemoryExecutor,
  values: typeof memoryAliasTable.$inferInsert,
): Promise<boolean> {
  const inserted = await executor
    .insert(memoryAliasTable)
    .values(values)
    .onConflictDoNothing()
    .returning({ slug: memoryAliasTable.entitySlug });
  return inserted.length > 0;
}

export async function insertFact(executor: MemoryExecutor, values: FactInsert): Promise<string> {
  const inserted = await executor
    .insert(memoryFactTable)
    .values(values)
    .returning({ id: memoryFactTable.id });
  return inserted[0]?.id ?? '';
}

export async function updateFact(
  executor: MemoryExecutor,
  id: string,
  values: Partial<FactInsert>,
): Promise<void> {
  await executor.update(memoryFactTable).set(values).where(eq(memoryFactTable.id, id));
}

export async function insertRelation(
  executor: MemoryExecutor,
  values: RelationInsert,
): Promise<string> {
  const inserted = await executor
    .insert(memoryRelationTable)
    .values(values)
    .returning({ id: memoryRelationTable.id });
  return inserted[0]?.id ?? '';
}

export async function updateRelation(
  executor: MemoryExecutor,
  id: string,
  values: Partial<RelationInsert>,
): Promise<void> {
  await executor.update(memoryRelationTable).set(values).where(eq(memoryRelationTable.id, id));
}

export async function upsertVerb(
  executor: MemoryExecutor,
  values: typeof memoryVerbTable.$inferInsert,
): Promise<void> {
  await executor
    .insert(memoryVerbTable)
    .values(values)
    .onConflictDoUpdate({
      target: memoryVerbTable.name,
      set: { description: values.description, linkLength: values.linkLength },
    });
}

export async function didInsertSource(
  executor: MemoryExecutor,
  values: typeof memorySourceTable.$inferInsert,
): Promise<boolean> {
  const inserted = await executor
    .insert(memorySourceTable)
    .values(values)
    .onConflictDoNothing()
    .returning({ slug: memorySourceTable.slug });
  return inserted.length > 0;
}

export async function didInsertCitation(
  executor: MemoryExecutor,
  values: typeof memoryCitationTable.$inferInsert,
): Promise<boolean> {
  const inserted = await executor
    .insert(memoryCitationTable)
    .values(values)
    .onConflictDoNothing()
    .returning({ slug: memoryCitationTable.entitySlug });
  return inserted.length > 0;
}

export async function upsertCommitment(
  executor: MemoryExecutor,
  values: typeof memoryCommitmentTable.$inferInsert,
): Promise<void> {
  const { slug: _slug, createdAt: _createdAt, ...changes } = values;
  await executor
    .insert(memoryCommitmentTable)
    .values(values)
    .onConflictDoUpdate({ target: memoryCommitmentTable.slug, set: changes });
}

export async function upsertTodo(
  executor: MemoryExecutor,
  values: typeof memoryTodoTable.$inferInsert,
): Promise<void> {
  const { id: _id, ...changes } = values;
  await executor
    .insert(memoryTodoTable)
    .values(values)
    .onConflictDoUpdate({ target: memoryTodoTable.id, set: changes });
}

export async function upsertFocusItem(
  executor: MemoryExecutor,
  values: typeof memoryFocusItemTable.$inferInsert,
): Promise<void> {
  const { rank: _rank, ...changes } = values;
  await executor
    .insert(memoryFocusItemTable)
    .values(values)
    .onConflictDoUpdate({ target: memoryFocusItemTable.rank, set: changes });
}

export async function upsertProposal(
  executor: MemoryExecutor,
  values: typeof memoryProposalTable.$inferInsert,
): Promise<void> {
  const { slug: _slug, ...changes } = values;
  await executor
    .insert(memoryProposalTable)
    .values(values)
    .onConflictDoUpdate({ target: memoryProposalTable.slug, set: changes });
}

export async function upsertDraft(
  executor: MemoryExecutor,
  values: typeof memoryDraftTable.$inferInsert,
): Promise<void> {
  const { slug: _slug, ...changes } = values;
  await executor
    .insert(memoryDraftTable)
    .values(values)
    .onConflictDoUpdate({ target: memoryDraftTable.slug, set: changes });
}

export async function upsertJournalEntry(
  executor: MemoryExecutor,
  values: typeof memoryJournalEntryTable.$inferInsert,
): Promise<void> {
  const { slug: _slug, ...changes } = values;
  await executor
    .insert(memoryJournalEntryTable)
    .values(values)
    .onConflictDoUpdate({ target: memoryJournalEntryTable.slug, set: changes });
}

export async function upsertDocument(
  executor: MemoryExecutor,
  values: typeof memoryDocumentTable.$inferInsert,
): Promise<void> {
  const { slug: _slug, ...changes } = values;
  await executor
    .insert(memoryDocumentTable)
    .values(values)
    .onConflictDoUpdate({ target: memoryDocumentTable.slug, set: changes });
}

export async function upsertState(
  executor: MemoryExecutor,
  values: typeof memoryStateTable.$inferInsert,
): Promise<void> {
  await executor
    .insert(memoryStateTable)
    .values(values)
    .onConflictDoUpdate({
      target: memoryStateTable.key,
      set: { value: values.value, updatedAt: values.updatedAt },
    });
}

export async function insertEvent(
  executor: MemoryExecutor,
  values: typeof memoryEventTable.$inferInsert,
): Promise<void> {
  await executor.insert(memoryEventTable).values(values);
}

export async function insertChangeBatch(
  executor: MemoryExecutor,
  values: typeof memoryChangeBatchTable.$inferInsert,
): Promise<void> {
  await executor.insert(memoryChangeBatchTable).values(values);
}

function replaceWikilinkTarget(column: PgColumn, fromSlug: string, toSlug: string) {
  return sql`replace(replace(replace(${column}, ${`[[${fromSlug}]]`}, ${`[[${toSlug}]]`}), ${`[[${fromSlug}|`}, ${`[[${toSlug}|`}), ${`[[${fromSlug}#`}, ${`[[${toSlug}#`})`;
}

export async function moveSlugEverywhere(
  executor: MemoryExecutor,
  fromSlug: string,
  toSlug: string,
): Promise<void> {
  await executor
    .update(memoryEntityTable)
    .set({ slug: toSlug })
    .where(eq(memoryEntityTable.slug, fromSlug));
  await executor
    .update(memoryAliasTable)
    .set({ entitySlug: toSlug })
    .where(eq(memoryAliasTable.entitySlug, fromSlug));
  await executor
    .update(memoryFactTable)
    .set({ entitySlug: toSlug })
    .where(eq(memoryFactTable.entitySlug, fromSlug));
  await executor
    .update(memoryRelationTable)
    .set({ fromSlug: toSlug })
    .where(eq(memoryRelationTable.fromSlug, fromSlug));
  await executor
    .update(memoryRelationTable)
    .set({ toSlug })
    .where(eq(memoryRelationTable.toSlug, fromSlug));
  await executor
    .update(memoryCitationTable)
    .set({ entitySlug: toSlug })
    .where(eq(memoryCitationTable.entitySlug, fromSlug));
  await executor
    .update(memoryEntityTable)
    .set({ body: replaceWikilinkTarget(memoryEntityTable.body, fromSlug, toSlug) })
    .where(like(memoryEntityTable.body, `%[[${fromSlug}%`));
  await executor
    .update(memoryCommitmentTable)
    .set({ body: replaceWikilinkTarget(memoryCommitmentTable.body, fromSlug, toSlug) })
    .where(like(memoryCommitmentTable.body, `%[[${fromSlug}%`));
  await executor
    .update(memoryProposalTable)
    .set({ body: replaceWikilinkTarget(memoryProposalTable.body, fromSlug, toSlug) })
    .where(like(memoryProposalTable.body, `%[[${fromSlug}%`));
  await executor
    .update(memoryDraftTable)
    .set({ body: replaceWikilinkTarget(memoryDraftTable.body, fromSlug, toSlug) })
    .where(like(memoryDraftTable.body, `%[[${fromSlug}%`));
}
