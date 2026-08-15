/**
 * Drizzle table and Zod input schemas for the books bounded context.
 *
 * The status vocabulary and the rating bounds are imported from
 * `books.core.ts`, which owns them, so the table, the request schema and the
 * write rules cannot disagree about what a status is.
 *
 * `shelf_id` carries no foreign key because Aurora DSQL enforces none. What
 * replaces it is `detachBooksFromShelf`, which `shelves.service.ts` calls
 * before it deletes a shelf. See docs/standards/11-database.md and
 * docs/adr/0006-cascade-on-delete-via-json-blob-scrub.md.
 */

import { date, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { BOOK_STATUSES, MAXIMUM_RATING, MINIMUM_RATING } from './books.core';

const TITLE_MAXIMUM_LENGTH = 256;
const AUTHOR_MAXIMUM_LENGTH = 256;
const NOTES_MAXIMUM_LENGTH = 8192;
const ISBN_MAXIMUM_LENGTH = 20;
const COVER_URL_MAXIMUM_LENGTH = 512;

// @FollowsBlueprint schema-table-and-input
export const bookTable = pgTable('book', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  status: text('status').notNull(),
  rating: integer('rating'),
  notes: text('notes').notNull().default(''),
  startedAt: date('started_at'),
  finishedAt: date('finished_at'),
  isbn: text('isbn'),
  coverUrl: text('cover_url'),
  shelfId: uuid('shelf_id'),
});

const CALENDAR_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

const calendarDaySchema = z.string().regex(CALENDAR_DAY_PATTERN);

export const bookCreateSchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAXIMUM_LENGTH),
  author: z.string().trim().min(1).max(AUTHOR_MAXIMUM_LENGTH),
  status: z.enum(BOOK_STATUSES),
  rating: z.number().int().min(MINIMUM_RATING).max(MAXIMUM_RATING).nullable().default(null),
  notes: z.string().max(NOTES_MAXIMUM_LENGTH).default(''),
  startedAt: calendarDaySchema.nullable().default(null),
  finishedAt: calendarDaySchema.nullable().default(null),
  isbn: z.string().max(ISBN_MAXIMUM_LENGTH).nullable().default(null),
  coverUrl: z.string().url().max(COVER_URL_MAXIMUM_LENGTH).nullable().default(null),
  shelfId: z.string().uuid().nullable().default(null),
});

export const bookUpdateSchema = bookCreateSchema.partial();
export const bookIdParamSchema = z.object({ id: z.string().uuid() });
export const bookLookupQuerySchema = z.object({ query: z.string().min(1) });
