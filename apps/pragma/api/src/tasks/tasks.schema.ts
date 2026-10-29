import { TASK_NOTES_MAX_LENGTH, TASK_TITLE_MAX_LENGTH } from '@domain/input-limits.core';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { pageInputShape, referenceSchema } from '../mcp/tool-input.schema';
import { DEFAULT_TASK_STATUS, TASK_STATUSES } from '@domain/task-status.core';

// @FollowsBlueprint schema-table-and-input
export const taskTable = pgTable('task', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull(),
  assigneeId: uuid('assignee_id'),
  songId: uuid('song_id'),
  sessionId: uuid('session_id'),
  dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(TASK_TITLE_MAX_LENGTH),
  notes: z.string().max(TASK_NOTES_MAX_LENGTH).default(''),
  status: z.enum(TASK_STATUSES).default(DEFAULT_TASK_STATUS),
  assigneeId: z.string().uuid().nullable().default(null),
  songId: z.string().uuid().nullable().default(null),
  sessionId: z.string().uuid().nullable().default(null),
  dueDate: z.string().datetime().nullable().default(null),
});

export const taskUpdateSchema = taskCreateSchema.partial();
export const taskIdParamSchema = z.object({ id: z.string().uuid() });
const taskLinkShape = {
  assignee: referenceSchema.nullable().optional(),
  song: referenceSchema.nullable().optional(),
};

export const taskListToolInputSchema = z.object({
  assignee: referenceSchema.optional(),
  song: referenceSchema.optional(),
  status: z.enum(TASK_STATUSES).optional(),
  ...pageInputShape,
});
export const taskCreateFieldsSchema = taskCreateSchema.omit({ assigneeId: true, songId: true });
export const taskSaveToolInputSchema = z
  .object({ task: referenceSchema.optional() })
  .merge(taskUpdateSchema.omit({ assigneeId: true, songId: true }))
  .extend(taskLinkShape);
