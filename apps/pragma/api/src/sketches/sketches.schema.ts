import { SKETCH_LANE_NAME_MAX_LENGTH } from '@domain/input-limits.core';
import { SKETCH_OFFSET_LAST_SECOND, SKETCH_TIMELINE_START_SECONDS } from '@domain/sketch.core';
import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const LANE_POSITION_LAST = 1_000;

// @FollowsBlueprint schema-table-and-input
export const sketchLaneTable = pgTable(
  'sketch_lane',
  {
    id: uuid('id').primaryKey(),
    songId: uuid('song_id').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [index('sketch_lane_song_idx').on(table.songId)],
);

export const sketchClipTable = pgTable(
  'sketch_clip',
  {
    id: uuid('id').primaryKey(),
    laneId: uuid('lane_id').notNull(),
    inspirationId: uuid('inspiration_id').notNull(),
    offsetSeconds: integer('offset_seconds').notNull(),
  },
  (table) => [
    index('sketch_clip_lane_idx').on(table.laneId),
    index('sketch_clip_inspiration_idx').on(table.inspirationId),
  ],
);

const laneNameSchema = z.string().trim().min(1).max(SKETCH_LANE_NAME_MAX_LENGTH);
const offsetSecondsSchema = z
  .number()
  .int()
  .min(SKETCH_TIMELINE_START_SECONDS)
  .max(SKETCH_OFFSET_LAST_SECOND);

export const sketchPathSchema = z.object({ songId: z.guid() });
export const sketchLanePathSchema = z.object({ songId: z.guid(), laneId: z.guid() });
export const sketchClipPathSchema = z.object({ songId: z.guid(), clipId: z.guid() });

export const sketchLaneCreateSchema = z
  .object({
    id: z.guid(),
    name: laneNameSchema,
    position: z.number().int().min(0).max(LANE_POSITION_LAST),
  })
  .strict();

export const sketchLaneRenameSchema = z.object({ name: laneNameSchema }).strict();

export const sketchClipCreateSchema = z
  .object({
    id: z.guid(),
    laneId: z.guid(),
    inspirationId: z.guid(),
    offsetSeconds: offsetSecondsSchema,
  })
  .strict();

export const sketchClipMoveSchema = z
  .object({ laneId: z.guid(), offsetSeconds: offsetSecondsSchema })
  .strict();

export type SketchLaneCreateInput = z.infer<typeof sketchLaneCreateSchema>;
export type SketchLaneRenameInput = z.infer<typeof sketchLaneRenameSchema>;
export type SketchClipCreateInput = z.infer<typeof sketchClipCreateSchema>;
export type SketchClipMoveInput = z.infer<typeof sketchClipMoveSchema>;
