/**
 * Data access for the books context, and the only file in it that imports the
 * database client.
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { BOOK_STATUSES, type BookDraft, type BookStatus } from './books.core';
import { bookTable } from './books.schema';

const bookStatusSchema = z.enum(BOOK_STATUSES);

export interface BookRow extends BookDraft {
  readonly id: string;
}

// @FollowsBlueprint repository-projection
const PROJECTION = {
  id: bookTable.id,
  title: bookTable.title,
  author: bookTable.author,
  status: bookTable.status,
  rating: bookTable.rating,
  notes: bookTable.notes,
  startedAt: bookTable.startedAt,
  finishedAt: bookTable.finishedAt,
  isbn: bookTable.isbn,
  coverUrl: bookTable.coverUrl,
  shelfId: bookTable.shelfId,
} as const;

interface PersistedBookRow {
  id: string;
  title: string;
  author: string;
  status: string;
  rating: number | null;
  notes: string;
  startedAt: string | null;
  finishedAt: string | null;
  isbn: string | null;
  coverUrl: string | null;
  shelfId: string | null;
}

/**
 * The `status` column is a `text`, which is wider than the domain union, so
 * the narrowing happens once here rather than at every read site.
 */
// @FollowsBlueprint repository-row-mapper
function toBookRow(row: PersistedBookRow): BookRow {
  return { ...row, status: readStatus(row.status) };
}

function readStatus(stored: string): BookStatus {
  return bookStatusSchema.parse(stored);
}

// @FollowsBlueprint repository-query
export async function listBooks(): Promise<BookRow[]> {
  const database = getDatabase();
  const rows = await database.select(PROJECTION).from(bookTable);
  return rows.map(toBookRow);
}

export async function listBooksOnShelf(shelfId: string): Promise<BookRow[]> {
  const database = getDatabase();
  const rows = await database
    .select(PROJECTION)
    .from(bookTable)
    .where(eq(bookTable.shelfId, shelfId));
  return rows.map(toBookRow);
}

export async function findBookById(id: string): Promise<BookRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(PROJECTION)
    .from(bookTable)
    .where(eq(bookTable.id, id))
    .limit(1);
  const row = rows[0];
  return row === undefined ? null : toBookRow(row);
}

export async function insertBook(draft: BookDraft): Promise<BookRow> {
  const database = getDatabase();
  const [row] = await database.insert(bookTable).values(draft).returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return toBookRow(row);
}

export async function updateBook(id: string, draft: BookDraft): Promise<BookRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(bookTable)
    .set(draft)
    .where(eq(bookTable.id, id))
    .returning(PROJECTION);
  return row === undefined ? null : toBookRow(row);
}

export async function deleteBook(id: string): Promise<number> {
  const database = getDatabase();
  const deleted = await database
    .delete(bookTable)
    .where(eq(bookTable.id, id))
    .returning({ id: bookTable.id });
  return deleted.length;
}

export async function clearShelfOnBooks(
  executor: DatabaseExecutor,
  shelfId: string,
): Promise<number> {
  const detached = await executor
    .update(bookTable)
    .set({ shelfId: null })
    .where(eq(bookTable.shelfId, shelfId))
    .returning({ id: bookTable.id });
  return detached.length;
}
