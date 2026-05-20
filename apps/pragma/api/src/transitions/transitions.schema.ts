/**
 * Drizzle schema for the transition-comments bounded context. A
 * comment lives on the ordered pair (songA, songB); the spec calls
 * A→B and B→A distinct rows.
 */

import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const transitionCommentTable = pgTable(
  'transition_comment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    songAId: uuid('song_a_id').notNull(),
    songBId: uuid('song_b_id').notNull(),
    comment: text('comment').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    orderedPair: uniqueIndex('transition_comment_ordered_pair').on(table.songAId, table.songBId),
  }),
);

export const transitionPairParamSchema = z.object({
  a: z.string().uuid(),
  b: z.string().uuid(),
});

export const transitionCommentBodySchema = z.object({
  comment: z.string().trim().min(1).max(4_096),
});
