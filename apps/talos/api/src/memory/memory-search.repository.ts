import { or, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { getDatabase } from '../database/client';
import {
  memoryCommitmentTable,
  memoryDocumentTable,
  memoryJournalEntryTable,
} from './memory-records.schema';
import {
  memoryAliasTable,
  memoryEntityTable,
  memoryFactTable,
  memorySourceTable,
} from './memory.schema';

const ACCENTED_LETTERS = 'ÀÂÄÁÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÇÑàâäáãéèêëíìîïóòôöõúùûüçñ';
const PLAIN_LETTERS = 'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn';

// @FollowsBlueprint repository-query
function foldText(column: PgColumn): ReturnType<typeof sql> {
  return sql`translate(lower(${column}), ${ACCENTED_LETTERS}, ${PLAIN_LETTERS})`;
}

function matchesFolded(column: PgColumn, foldedPattern: string): ReturnType<typeof sql> {
  return sql`${foldText(column)} like ${foldedPattern}`;
}

export async function searchEntities(
  foldedPattern: string,
  limit: number,
): Promise<(typeof memoryEntityTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryEntityTable)
    .where(
      or(
        matchesFolded(memoryEntityTable.title, foldedPattern),
        matchesFolded(memoryEntityTable.summary, foldedPattern),
        matchesFolded(memoryEntityTable.body, foldedPattern),
      ),
    )
    .limit(limit);
}

export async function searchAliases(
  foldedPattern: string,
  limit: number,
): Promise<(typeof memoryAliasTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryAliasTable)
    .where(matchesFolded(memoryAliasTable.value, foldedPattern))
    .limit(limit);
}

export async function searchFacts(
  foldedPattern: string,
  limit: number,
): Promise<(typeof memoryFactTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryFactTable)
    .where(
      or(
        matchesFolded(memoryFactTable.value, foldedPattern),
        matchesFolded(memoryFactTable.raw, foldedPattern),
      ),
    )
    .limit(limit);
}

export async function searchCommitments(
  foldedPattern: string,
  limit: number,
): Promise<(typeof memoryCommitmentTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryCommitmentTable)
    .where(
      or(
        matchesFolded(memoryCommitmentTable.action, foldedPattern),
        matchesFolded(memoryCommitmentTable.body, foldedPattern),
      ),
    )
    .limit(limit);
}

export async function searchSources(
  foldedPattern: string,
  limit: number,
): Promise<(typeof memorySourceTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memorySourceTable)
    .where(matchesFolded(memorySourceTable.content, foldedPattern))
    .limit(limit);
}

export async function searchJournalEntries(
  foldedPattern: string,
  limit: number,
): Promise<(typeof memoryJournalEntryTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryJournalEntryTable)
    .where(matchesFolded(memoryJournalEntryTable.content, foldedPattern))
    .limit(limit);
}

export async function searchDocuments(
  foldedPattern: string,
  limit: number,
): Promise<(typeof memoryDocumentTable.$inferSelect)[]> {
  return await getDatabase()
    .select()
    .from(memoryDocumentTable)
    .where(matchesFolded(memoryDocumentTable.content, foldedPattern))
    .limit(limit);
}
