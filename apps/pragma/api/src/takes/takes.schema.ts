import {
  TAKE_COMMENT_MAX_LENGTH,
  TAKE_CONTENT_TYPES,
  TAKE_DURATION_MAX_SECONDS,
  TAKE_MAX_BYTES,
  TAKE_SOURCES,
} from '@domain/take-upload.core';
import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { isExactlyOneTakeFilterNamed } from './takes.core';
import { pageInputShape, referenceSchema } from '../mcp/tool-input.schema';

const OBJECT_KEY_MAX_LENGTH = 512;

// @FollowsBlueprint schema-table-and-input
export const takeTable = pgTable(
  'take',
  {
    id: uuid('id').primaryKey(),
    songId: uuid('song_id').notNull(),
    sessionId: uuid('session_id'),
    memberId: uuid('member_id').notNull(),
    objectKey: text('object_key').notNull(),
    contentType: text('content_type').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [index('take_song_recorded_idx').on(table.songId, table.recordedAt)],
);

export const takeCommentTable = pgTable(
  'take_comment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    takeId: uuid('take_id').notNull(),
    memberId: uuid('member_id').notNull(),
    body: text('body').notNull(),
    atSeconds: integer('at_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [index('take_comment_take_created_idx').on(table.takeId, table.createdAt)],
);

const takeContentTypeSchema = z.enum(TAKE_CONTENT_TYPES);

export const takeSignSchema = z
  .object({
    takeId: z.string().uuid(),
    songId: z.string().uuid(),
    contentType: takeContentTypeSchema,
    contentLength: z.number().int().positive().max(TAKE_MAX_BYTES),
  })
  .strict();

export const takeCreateSchema = z
  .object({
    id: z.string().uuid(),
    objectKey: z.string().min(1).max(OBJECT_KEY_MAX_LENGTH),
    songId: z.string().uuid(),
    sessionId: z.string().uuid().nullable().default(null),
    recordedAt: z.string().datetime(),
    durationSeconds: z.number().int().min(0).max(TAKE_DURATION_MAX_SECONDS),
    contentType: takeContentTypeSchema,
    source: z.enum(TAKE_SOURCES),
    queued: z.boolean(),
    fromPracticeMode: z.boolean().default(false),
  })
  .strict();

export const takeListQuerySchema = z
  .object({ songId: z.string().uuid().optional(), sessionId: z.string().uuid().optional() })
  .refine(isExactlyOneTakeFilterNamed, { message: 'one-of-song-or-session' });

export const takePathSchema = z.object({ id: z.string().uuid() });

export const takeCommentPathSchema = z.object({
  id: z.string().uuid(),
  commentId: z.string().uuid(),
});

const commentBodySchema = z.string().trim().min(1).max(TAKE_COMMENT_MAX_LENGTH);
const momentSchema = z.number().int().min(0).nullable();

export const takeCommentCreateSchema = z
  .object({ body: commentBodySchema, atSeconds: momentSchema.default(null) })
  .strict();

const takeCommentChangesSchema = z
  .object({ body: commentBodySchema.optional(), atSeconds: momentSchema.optional() })
  .strict();

export const takeCommentUpdateSchema = takeCommentChangesSchema.refine(
  (update) => update.body !== undefined || update.atSeconds !== undefined,
  {
    message: 'nothing to update',
  },
);

const takeChoiceShape = {
  take: z.string().uuid().optional(),
  song: referenceSchema.optional(),
};

export const takeListToolInputSchema = z.object({ song: referenceSchema, ...pageInputShape });
export const takeReadToolInputSchema = z.object(takeChoiceShape);
export const takeSignToolInputSchema = z.object({
  takeId: z.string().uuid(),
  song: referenceSchema,
  contentType: takeContentTypeSchema,
  contentLength: z.number().int().positive().max(TAKE_MAX_BYTES),
});

export type TakeSignInput = z.infer<typeof takeSignSchema>;
export type TakeCreateInput = z.infer<typeof takeCreateSchema>;
export type TakeCommentCreateInput = z.infer<typeof takeCommentCreateSchema>;
export type TakeCommentUpdateInput = z.infer<typeof takeCommentUpdateSchema>;
