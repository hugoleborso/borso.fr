import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { CONCERT_PRIZE_ICONS } from '@domain/concert-prize.core';
import {
  CONCERT_PRIZE_LABEL_MAX_LENGTH,
  CONCERT_PUBLIC_MESSAGE_MAX_LENGTH,
  REGISTRATION_EMAIL_MAX_LENGTH,
  REGISTRATION_FIRST_NAME_MAX_LENGTH,
} from '@domain/input-limits.core';
import { ALLOWED_POSTER_CONTENT_TYPES, MAX_POSTER_BYTES } from './concert-registrations.types';

// @FollowsBlueprint schema-table-and-input
export const concertRegistrationTable = pgTable(
  'concert_registration',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull(),
    firstName: text('first_name').notNull(),
    email: text('email').notNull(),
    canonicalEmail: text('canonical_email').notNull(),
    editTokenHash: text('edit_token_hash').notNull(),
    comingForMemberId: uuid('coming_for_member_id'),
    wishedSongId: uuid('wished_song_id'),
    registeredAt: timestamp('registered_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [
    unique('concert_registration_session_canonical_email_unique').on(
      table.sessionId,
      table.canonicalEmail,
    ),
  ],
);

const TRACK_ID_MAX = 64;
const POSTER_S3_KEY_MAX = 512;

export const concertParamSchema = z.object({ sessionId: z.guid() });

export const registrationParamSchema = z.object({ registrationId: z.guid() });

export const concertRegistrationParamSchema = concertParamSchema.extend(
  registrationParamSchema.shape,
);

export const registrationCreateSchema = z
  .object({
    firstName: z.string().trim().min(1).max(REGISTRATION_FIRST_NAME_MAX_LENGTH),
    email: z.string().trim().toLowerCase().max(REGISTRATION_EMAIL_MAX_LENGTH).pipe(z.email()),
  })
  .strict();

export const registrationPatchSchema = z
  .object({
    comingForMemberId: z.guid().nullable().optional(),
    wishedTrackId: z.string().trim().min(1).max(TRACK_ID_MAX).optional(),
  })
  .strict();

export const announcementPatchSchema = z
  .object({
    message: z.string().max(CONCERT_PUBLIC_MESSAGE_MAX_LENGTH).nullable().optional(),
    posterS3Key: z.string().min(1).max(POSTER_S3_KEY_MAX).nullable().optional(),
    prizeLabel: z.string().trim().min(1).max(CONCERT_PRIZE_LABEL_MAX_LENGTH).nullable().optional(),
    prizeIcon: z.enum(CONCERT_PRIZE_ICONS).optional(),
  })
  .strict();

export const posterUploadSchema = z
  .object({
    contentType: z.enum(ALLOWED_POSTER_CONTENT_TYPES),
    byteSize: z.number().int().positive().max(MAX_POSTER_BYTES),
  })
  .strict();
