/**
 * Drizzle schema for the sessions bounded context. `session` is
 * single-table inheritance keyed by `kind`. Concert-only columns are
 * nullable; the API validates the shape per kind via the discriminated
 * union below. Both branches are `strict()` so a practice payload
 * carrying a concert-only key (or vice versa) is rejected at the
 * controller boundary. `friends_count_per_member` is stored as TEXT
 * (JSON-encoded) because Aurora DSQL doesn't support `jsonb` — see
 * docs/knowledge/dsql-postgres-compat-gaps.md §1.
 */

import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// @FollowsBlueprint schema-table-and-input
export const sessionTable = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),
  date: timestamp('date', { withTimezone: true, mode: 'date' }).notNull(),
  preparedConcertId: uuid('prepared_concert_id'),
  venue: text('venue'),
  capacity: integer('capacity'),
  gear: text('gear'),
  // Aurora DSQL doesn't support jsonb — see docs/knowledge/dsql-postgres-compat-gaps.md §1
  friendsCountPerMember: text('friends_count_per_member'),
});

// Also used by the repository to validate the JSON blob deserialised
// from the `friends_count_per_member` text column (Aurora DSQL stores
// it as TEXT — see docs/knowledge/dsql-postgres-compat-gaps.md §1).
export const friendsCountSchema = z.record(z.string().uuid(), z.number().int().min(0).max(1_000));

const VENUE_MAX = 256;
const CAPACITY_MAX = 100_000;
const GEAR_MAX = 2_048;

export const concertCreateSchema = z
  .object({
    kind: z.literal('concert'),
    date: z.string().datetime(),
    venue: z.string().trim().min(1).max(VENUE_MAX),
    capacity: z.number().int().min(0).max(CAPACITY_MAX),
    gear: z.string().max(GEAR_MAX).default(''),
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

/**
 * The columns a patch is allowed to write, after the service has turned the
 * request body into what the row holds. It is a separate schema from
 * `sessionUpdateSchema` because `date` has already become a `Date` by then,
 * and `z.date()` rejects the `Invalid Date` a malformed string would produce.
 */
export const sessionPersistedUpdateSchema = z
  .object({
    date: z.date(),
    venue: z.string().trim().min(1).max(VENUE_MAX),
    capacity: z.number().int().min(0).max(CAPACITY_MAX),
    gear: z.string().max(GEAR_MAX),
    friendsCountPerMember: friendsCountSchema,
    preparedConcertId: z.string().uuid().nullable(),
  })
  .partial();

export type SessionPersistedUpdate = z.infer<typeof sessionPersistedUpdateSchema>;

export const sessionIdParamSchema = z.object({ id: z.string().uuid() });
