/**
 * Drizzle table and Zod input schemas for the shelves bounded context.
 *
 * A shelf is a named grouping a book may belong to, and nothing more. The
 * books that sit on it are read through the books context, which owns the
 * `book.shelf_id` column.
 */

import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const SHELF_NAME_MAXIMUM_LENGTH = 128;

// @FollowsBlueprint schema-table-and-input
export const shelfTable = pgTable('shelf', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
});

export const shelfCreateSchema = z.object({
  name: z.string().trim().min(1).max(SHELF_NAME_MAXIMUM_LENGTH),
});

export const shelfIdParamSchema = z.object({ id: z.string().uuid() });
