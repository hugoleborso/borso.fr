import { integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const SCORE_MIN = 0;
const SCORE_MAX = 10;

// @FollowsBlueprint schema-table-and-input
export const masteryDefaultTable = pgTable(
  'mastery_default',
  {
    memberId: uuid('member_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    score: integer('score').notNull(),
  },
  (table) => [primaryKey({ columns: [table.memberId, table.instrumentId] })],
);

export const masteryOverrideTable = pgTable(
  'mastery_override',
  {
    memberId: uuid('member_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    songId: uuid('song_id').notNull(),
    score: integer('score').notNull(),
  },
  (table) => [primaryKey({ columns: [table.memberId, table.instrumentId, table.songId] })],
);

const scoreSchema = z.number().int().min(SCORE_MIN).max(SCORE_MAX);

export const masteryDefaultRowSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  score: scoreSchema,
});

export const masteryOverrideRowSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  songId: z.string().uuid(),
  score: scoreSchema,
});

export const masteryDefaultPathSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
});

export const masteryOverridePathSchema = masteryDefaultPathSchema.extend({
  songId: z.string().uuid(),
});

export const masterySongIdParamSchema = z.object({ songId: z.string().uuid() });
