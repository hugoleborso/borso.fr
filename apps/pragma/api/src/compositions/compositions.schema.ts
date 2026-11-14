import { SONG_TEXT_FIELD_MAX_LENGTH } from '@domain/input-limits.core';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// @FollowsBlueprint schema-table-and-input
export const compositionTable = pgTable(
  'composition',
  {
    id: uuid('id').primaryKey(),
    title: text('title').notNull(),
    songId: uuid('song_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [index('composition_song_idx').on(table.songId)],
);

const compositionTitleSchema = z.string().trim().min(1).max(SONG_TEXT_FIELD_MAX_LENGTH);

export const compositionPathSchema = z.object({ id: z.guid() });

export const compositionCreateSchema = z
  .object({ id: z.guid(), title: compositionTitleSchema })
  .strict();

export const compositionRenameSchema = z.object({ title: compositionTitleSchema }).strict();

export type CompositionCreateInput = z.infer<typeof compositionCreateSchema>;
export type CompositionRenameInput = z.infer<typeof compositionRenameSchema>;
