import { MASTERY_SCORE_MAX, MASTERY_SCORE_MIN } from '@domain/input-limits.core';
import { integer, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

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

export const masteryScoreChangeTable = pgTable('mastery_score_change', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull(),
  instrumentId: uuid('instrument_id').notNull(),
  songId: uuid('song_id').notNull(),
  score: integer('score').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const masteryScoreSchema = z.number().int().min(MASTERY_SCORE_MIN).max(MASTERY_SCORE_MAX);

export const masteryDefaultRowSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  score: masteryScoreSchema,
});

export const masteryOverrideRowSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  songId: z.string().uuid(),
  score: masteryScoreSchema,
});

export const masteryDefaultPathSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
});

export const masteryOverridePathSchema = masteryDefaultPathSchema.extend({
  songId: z.string().uuid(),
});

export const masterySongIdParamSchema = z.object({ songId: z.string().uuid() });
