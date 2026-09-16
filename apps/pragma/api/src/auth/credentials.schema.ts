import { customType, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

// @FollowsBlueprint schema-dsql-constraints
export const memberCredentialTable = pgTable('member_credential', {
  memberId: uuid('member_id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  sessionEpoch: integer('session_epoch').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const memberPasskeyTable = pgTable('member_passkey', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull(),
  credentialId: text('credential_id').notNull(),
  publicKey: bytea('public_key').notNull(),
  signCounter: integer('sign_counter').notNull(),
  transports: text('transports').notNull(),
  label: text('label').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const webauthnChallengeTable = pgTable('webauthn_challenge', {
  challenge: text('challenge').primaryKey(),
  memberId: uuid('member_id'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});

const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 64;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 256;
const PASSKEY_LABEL_MAX_LENGTH = 64;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN_LENGTH)
  .max(USERNAME_MAX_LENGTH)
  .regex(USERNAME_PATTERN, 'expected lowercase letters, digits, dot, dash or underscore');

export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

export const memberLoginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const enrolSchema = z.object({
  memberId: z.string().uuid(),
  username: usernameSchema,
  password: passwordSchema,
  sharedPassword: passwordSchema,
});

export const passwordChangeSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});

export const passkeyLabelSchema = z.object({
  label: z.string().trim().min(1).max(PASSKEY_LABEL_MAX_LENGTH),
});

export const passkeyRegistrationSchema = passkeyLabelSchema.extend({
  response: z.unknown(),
});

export const passkeyAuthenticationSchema = z.object({
  response: z.unknown(),
});

export const passkeyIdParamSchema = z.object({ passkeyId: z.string().uuid() });
