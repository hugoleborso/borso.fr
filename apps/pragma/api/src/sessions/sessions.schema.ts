import {
  CONCERT_CAPACITY_MAX,
  CONCERT_GEAR_MAX_LENGTH,
  CONCERT_VENUE_MAX_LENGTH,
  FRIENDS_PER_MEMBER_MAX,
} from '@domain/input-limits.core';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { pageInputShape, referenceSchema } from '../mcp/tool-input.schema';
import { SESSION_WINDOWS } from './session-tool.core';

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
  origin: text('origin'),
});

export const SESSION_ORIGINS = ['free_slot'] as const;
export const SESSION_KINDS = ['concert', 'practice'] as const;

export const friendsCountSchema = z.record(
  z.guid(),
  z.number().int().min(0).max(FRIENDS_PER_MEMBER_MAX),
);

const concertFieldShape = {
  kind: z.literal('concert'),
  date: z.iso.datetime(),
  venue: z.string().trim().min(1).max(CONCERT_VENUE_MAX_LENGTH),
  capacity: z.number().int().min(0).max(CONCERT_CAPACITY_MAX),
  gear: z.string().max(CONCERT_GEAR_MAX_LENGTH),
  friendsCountPerMember: friendsCountSchema,
};

const practiceFieldShape = {
  kind: z.literal('practice'),
  date: z.iso.datetime(),
  preparedConcertId: z.guid().nullable(),
  origin: z.enum(SESSION_ORIGINS).nullable(),
};

export const concertCreateSchema = z
  .object({
    ...concertFieldShape,
    gear: concertFieldShape.gear.default(''),
    friendsCountPerMember: concertFieldShape.friendsCountPerMember.default({}),
  })
  .strict();

export const practiceCreateSchema = z
  .object({
    ...practiceFieldShape,
    preparedConcertId: practiceFieldShape.preparedConcertId.default(null),
    origin: practiceFieldShape.origin.default(null),
  })
  .strict();

export const sessionCreateSchema = z.discriminatedUnion('kind', [
  concertCreateSchema,
  practiceCreateSchema,
]);

export const concertUpdateSchema = z
  .object(concertFieldShape)
  .strict()
  .partial()
  .extend({ kind: z.literal('concert').optional() });
export const practiceUpdateSchema = z
  .object(practiceFieldShape)
  .strict()
  .partial()
  .extend({ kind: z.literal('practice').optional() });
export const sessionUpdateSchema = z.union([concertUpdateSchema, practiceUpdateSchema]);

export const sessionPersistedUpdateSchema = z
  .object({
    date: z.date(),
    venue: z.string().trim().min(1).max(CONCERT_VENUE_MAX_LENGTH),
    capacity: z.number().int().min(0).max(CONCERT_CAPACITY_MAX),
    gear: z.string().max(CONCERT_GEAR_MAX_LENGTH),
    friendsCountPerMember: friendsCountSchema,
    preparedConcertId: z.guid().nullable(),
  })
  .partial();

export type SessionPersistedUpdate = z.infer<typeof sessionPersistedUpdateSchema>;

export const sessionIdParamSchema = z.object({ id: z.guid() });

export const sessionSaveToolInputSchema = z.object({
  ...z.object(concertFieldShape).partial().shape,
  ...z.object(practiceFieldShape).partial().shape,
  session: referenceSchema.optional(),
  kind: z.enum(SESSION_KINDS).optional(),
});
export const sessionFindToolInputSchema = z.object({
  when: z.enum(SESSION_WINDOWS).default('upcoming'),
  kind: z.enum(SESSION_KINDS).optional(),
  ...pageInputShape,
});
