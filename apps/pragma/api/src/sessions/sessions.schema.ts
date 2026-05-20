/**
 * Drizzle schema for the sessions bounded context. `session` is
 * single-table inheritance keyed by `kind`. Concert-only columns are
 * nullable; the API validates the shape per kind via the discriminated
 * union below. Both branches are `strict()` so a practice payload
 * carrying a concert-only key (or vice versa) is rejected at the
 * controller boundary.
 */

import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const sessionTable = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),
  date: timestamp('date', { withTimezone: true, mode: 'date' }).notNull(),
  preparedConcertId: uuid('prepared_concert_id'),
  venue: text('venue'),
  capacity: integer('capacity'),
  gear: text('gear'),
  friendsCountPerMember: jsonb('friends_count_per_member'),
});

const friendsCountSchema = z.record(z.string().uuid(), z.number().int().min(0).max(1_000));

export const concertCreateSchema = z
  .object({
    kind: z.literal('concert'),
    date: z.string().datetime(),
    venue: z.string().trim().min(1).max(256),
    capacity: z.number().int().min(0).max(100_000),
    gear: z.string().max(2_048).default(''),
    friendsCountPerMember: friendsCountSchema.default({}),
  })
  .strict();

export const practiceCreateSchema = z
  .object({
    kind: z.literal('practice'),
    date: z.string().datetime(),
    preparedConcertId: z.string().uuid().nullable().default(null),
  })
  .strict();

export const sessionCreateSchema = z.discriminatedUnion('kind', [
  concertCreateSchema,
  practiceCreateSchema,
]);

export const concertUpdateSchema = concertCreateSchema
  .partial()
  .extend({ kind: z.literal('concert').optional() });
export const practiceUpdateSchema = practiceCreateSchema
  .partial()
  .extend({ kind: z.literal('practice').optional() });
export const sessionUpdateSchema = z.union([concertUpdateSchema, practiceUpdateSchema]);

export const sessionIdParamSchema = z.object({ id: z.string().uuid() });
