/**
 * Orchestration for the books context: read, decide in `books.core.ts`, then
 * write. Every branch below is either a shape test on a repository answer or a
 * dispatch on the decision the core returned.
 *
 * `detachBooksFromShelf` is the books half of the shelf cascade. Aurora DSQL
 * enforces no foreign key, so `shelves.service.ts` calls this before it
 * deletes a shelf rather than relying on the engine, and hands over the
 * transaction it opened so both halves land or neither does.
 */

import type { z } from 'zod';
import type { DatabaseExecutor } from '../database/client';
import {
  type BookRejectionReason,
  decideBookWrite,
  mergeBookDraft,
  selectBookRejectionStatus,
} from './books.core';
import {
  type BookRow,
  clearShelfOnBooks,
  deleteBook,
  findBookById,
  insertBook,
  listBooks,
  listBooksOnShelf,
  updateBook,
} from './books.repository';
import type { bookCreateSchema, bookUpdateSchema } from './books.schema';
import { listOpenLibraryMatches } from './openlibrary.adapter';
import type { BookLookupHit } from './openlibrary.core';

/**
 * The status a rejection answers with, re-exported so the controller reads one
 * module for this slice rather than importing the core file directly.
 */
// @FollowsBlueprint service-facade-reexport
export { selectBookRejectionStatus };

type BookCreateInput = z.infer<typeof bookCreateSchema>;
type BookUpdateInput = z.infer<typeof bookUpdateSchema>;

/**
 * A failure a caller has to tell apart, so the controller matches on the class
 * rather than on the message text.
 */
// @FollowsBlueprint named-domain-error
export class BookRejectedError extends Error {
  override readonly name = 'BookRejectedError';
  readonly reason: BookRejectionReason;
  constructor(reason: BookRejectionReason) {
    super(reason);
    this.reason = reason;
  }
}

export async function listBooksSortedByTitle(): Promise<BookRow[]> {
  const books = await listBooks();
  return books.toSorted((left, right) => left.title.localeCompare(right.title));
}

export async function findBook(id: string): Promise<BookRow | null> {
  return await findBookById(id);
}

// @FollowsBlueprint service-orchestration
export async function createBook(input: BookCreateInput, now: Date): Promise<BookRow> {
  const decision = decideBookWrite(input, now);
  if (decision.kind === 'rejected') throw new BookRejectedError(decision.reason);
  return await insertBook(decision.book);
}

export type BookPatchOutcome =
  { readonly kind: 'ok'; readonly book: BookRow } | { readonly kind: 'not-found' };

/**
 * A partial update reads the stored book first, because the write rules apply
 * to the book as it will be and not to the fields the request happened to
 * carry: clearing a rating and setting the status to `finished` are the same
 * write from the rule's point of view.
 */
// @FollowsBlueprint service-crud-update
export async function patchBook(
  id: string,
  input: BookUpdateInput,
  now: Date,
): Promise<BookPatchOutcome> {
  const stored = await findBookById(id);
  if (stored === null) return { kind: 'not-found' };
  const decision = decideBookWrite(mergeBookDraft(stored, input), now);
  if (decision.kind === 'rejected') throw new BookRejectedError(decision.reason);
  const book = await updateBook(id, decision.book);
  if (book === null) return { kind: 'not-found' };
  return { kind: 'ok', book };
}

export async function removeBook(id: string): Promise<number> {
  return await deleteBook(id);
}

export async function listShelfBooks(shelfId: string): Promise<BookRow[]> {
  const books = await listBooksOnShelf(shelfId);
  return books.toSorted((left, right) => left.title.localeCompare(right.title));
}

/**
 * Clears the shelf reference every book on the given shelf carries, and answers
 * how many books lost it. The executor arrives from the caller because the
 * detach is one half of a two-table workflow the shelves service owns, so it
 * has to write through that workflow's transaction rather than open its own.
 */
export async function detachBooksFromShelf(
  executor: DatabaseExecutor,
  shelfId: string,
): Promise<number> {
  return await clearShelfOnBooks(executor, shelfId);
}

/**
 * The OpenLibrary matches for a free-text query. The adapter owns the network
 * call, its cache and its rate limit; the service exists so the controller
 * never imports the adapter.
 */
export async function listBookLookupMatches(query: string): Promise<readonly BookLookupHit[]> {
  return await listOpenLibraryMatches(query);
}
