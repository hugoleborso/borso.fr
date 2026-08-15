/**
 * Orchestration for the shelves context.
 *
 * Deleting a shelf is the one workflow here that reaches another slice.
 * Aurora DSQL enforces no foreign key, so `ON DELETE SET NULL` does not exist
 * and the cascade is written out: the books context detaches its rows first,
 * through its own service, and only then does the shelf row go. Reaching into
 * `books.repository.ts` from here would take ownership of a table this slice
 * does not own. See docs/adr/0006-cascade-on-delete-via-json-blob-scrub.md.
 */

import { detachBooksFromShelf } from '../books/books.service';
import {
  deleteShelf,
  findShelfById,
  insertShelf,
  listShelves,
  type ShelfRow,
  updateShelfName,
} from './shelves.repository';

export async function listShelvesSortedByName(): Promise<ShelfRow[]> {
  const shelves = await listShelves();
  return shelves.toSorted((left, right) => left.name.localeCompare(right.name));
}

export async function findShelf(id: string): Promise<ShelfRow | null> {
  return await findShelfById(id);
}

export async function createShelf(name: string): Promise<ShelfRow> {
  return await insertShelf(name);
}

export async function renameShelf(id: string, name: string): Promise<ShelfRow | null> {
  return await updateShelfName(id, name);
}

export interface ShelfRemoval {
  readonly kind: 'ok' | 'not-found';
  readonly detachedBookCount: number;
}

const NO_BOOKS_DETACHED = 0;

// @FollowsBlueprint service-orchestration
export async function removeShelf(id: string): Promise<ShelfRemoval> {
  const shelf = await findShelfById(id);
  if (shelf === null) return { kind: 'not-found', detachedBookCount: NO_BOOKS_DETACHED };
  const detachedBookCount = await detachBooksFromShelf(id);
  await deleteShelf(id);
  return { kind: 'ok', detachedBookCount };
}
