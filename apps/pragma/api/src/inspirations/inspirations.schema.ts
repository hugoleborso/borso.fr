import { INSPIRATION_NOTE_MAX_LENGTH, SONG_TEXT_FIELD_MAX_LENGTH } from '@domain/input-limits.core';
import { isPassageAccepted, YOUTUBE_VIDEO_ID_PATTERN } from '@domain/inspiration.core';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const PASSAGE_REFUSED_MESSAGE = 'passage-refused';

// @FollowsBlueprint schema-table-and-input
export const inspirationTable = pgTable('inspiration', {
  id: uuid('id').primaryKey(),
  youtubeVideoId: text('youtube_video_id').notNull(),
  title: text('title').notNull(),
  artist: text('artist').notNull().default(''),
  deezerTrackId: text('deezer_track_id'),
  deezerAlbumId: text('deezer_album_id'),
  startSeconds: integer('start_seconds').notNull(),
  endSeconds: integer('end_seconds').notNull(),
  note: text('note').notNull().default(''),
  authorMemberId: uuid('author_member_id'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

const deezerIdentifierSchema = z.string().min(1).max(SONG_TEXT_FIELD_MAX_LENGTH).nullable();
const secondSchema = z.number().int().min(0);

const inspirationFieldsShape = {
  youtubeVideoId: z.string().regex(YOUTUBE_VIDEO_ID_PATTERN),
  title: z.string().trim().min(1).max(SONG_TEXT_FIELD_MAX_LENGTH),
  artist: z.string().trim().max(SONG_TEXT_FIELD_MAX_LENGTH),
  deezerTrackId: deezerIdentifierSchema,
  deezerAlbumId: deezerIdentifierSchema,
  startSeconds: secondSchema,
  endSeconds: secondSchema,
  note: z.string().trim().max(INSPIRATION_NOTE_MAX_LENGTH),
};

export const inspirationCreateSchema = z
  .object({ id: z.guid(), ...inspirationFieldsShape })
  .strict()
  .refine(isPassageAccepted, { message: PASSAGE_REFUSED_MESSAGE });

export const inspirationUpdateSchema = z
  .object(inspirationFieldsShape)
  .strict()
  .refine(isPassageAccepted, { message: PASSAGE_REFUSED_MESSAGE });

export const inspirationPathSchema = z.object({ id: z.guid() });

export type InspirationCreateInput = z.infer<typeof inspirationCreateSchema>;
export type InspirationUpdateInput = z.infer<typeof inspirationUpdateSchema>;
