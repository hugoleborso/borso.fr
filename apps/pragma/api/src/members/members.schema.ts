/**
 * Drizzle schema for the members bounded context.
 *
 * `member` is the band-member directory. `member_instrument` is the
 * many-to-many link between members and instruments — a row says
 * "this member plays this instrument as one of their possible
 * stations".
 */

import { pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;

export const memberTable = pgTable('member', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  color: text('color').notNull(),
  avatarS3Key: text('avatar_s3_key'),
});

export const memberInstrumentTable = pgTable(
  'member_instrument',
  {
    memberId: uuid('member_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.memberId, table.instrumentId] }),
  }),
);

export const firstNameSchema = z.string().trim().min(1).max(64);
export const colorSchema = z
  .string()
  .regex(HEX_COLOR_PATTERN, 'expected hex color like #abc or #aabbcc');
export const avatarS3KeySchema = z.string().min(1).max(512).nullable();

export const createMemberSchema = z.object({
  firstName: firstNameSchema,
  color: colorSchema.optional(),
  avatarS3Key: avatarS3KeySchema.optional(),
});

export const updateMemberSchema = z.object({
  firstName: firstNameSchema.optional(),
  color: colorSchema.optional(),
  avatarS3Key: avatarS3KeySchema.optional(),
});

export const memberInstrumentAssignmentSchema = z.object({
  instrumentIds: z.array(z.string().uuid()),
});

export const memberIdParamSchema = z.object({ id: z.string().uuid() });
