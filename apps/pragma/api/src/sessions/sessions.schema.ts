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
  friendsCountPerMember: text('friends_count_per_member'),
});

const FRIENDS_PER_MEMBER_MAX = 1_000;

export const friendsCountSchema = z.record(
  z.string().uuid(),
  z.number().int().min(0).max(FRIENDS_PER_MEMBER_MAX),
);

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
