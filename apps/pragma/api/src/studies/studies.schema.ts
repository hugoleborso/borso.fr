import { date, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { referenceSchema } from '../mcp/tool-input.schema';

// @FollowsBlueprint schema-dsql-constraints
export const studyTable = pgTable(
  'study',
  {
    memberId: uuid('member_id').notNull(),
    songId: uuid('song_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    studiedOn: date('studied_on', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [
    primaryKey({
      name: 'study_pk',
      columns: [table.memberId, table.songId, table.instrumentId, table.studiedOn],
    }),
  ],
);

export const studyLogSchema = z
  .object({
    songId: z.string().uuid(),
    instrumentId: z.string().uuid(),
  })
  .strict();

export const studyPathSchema = z.object({
  songId: z.string().uuid(),
  instrumentId: z.string().uuid(),
});

export const studyToolInputSchema = z.object({
  song: referenceSchema,
  instrument: referenceSchema,
  undo: z.boolean().optional(),
});

export type StudyLogInput = z.infer<typeof studyLogSchema>;
