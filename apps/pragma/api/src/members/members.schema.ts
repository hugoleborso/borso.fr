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
  (table) => [primaryKey({ columns: [table.memberId, table.instrumentId] })],
);

const FIRST_NAME_MAX = 64;
const AVATAR_S3_KEY_MAX = 512;

export const firstNameSchema = z.string().trim().min(1).max(FIRST_NAME_MAX);
export const colorSchema = z
  .string()
  .regex(HEX_COLOR_PATTERN, 'expected hex color like #abc or #aabbcc');
export const avatarS3KeySchema = z.string().min(1).max(AVATAR_S3_KEY_MAX).nullable();

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
