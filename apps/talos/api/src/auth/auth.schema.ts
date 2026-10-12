import { zValidator } from '@hono/zod-validator';
import { customType, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

const MAXIMUM_BOOTSTRAP_CODE_LENGTH = 200;

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

// @FollowsBlueprint schema-dsql-constraints
export const passkeyTable = pgTable('passkey', {
  id: uuid('id').primaryKey().defaultRandom(),
  credentialId: text('credential_id').notNull(),
  publicKey: bytea('public_key').notNull(),
  signCounter: integer('sign_counter').notNull(),
  transports: text('transports').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const webauthnChallengeTable = pgTable('webauthn_challenge', {
  challenge: text('challenge').primaryKey(),
  purpose: text('purpose').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const sessionTable = pgTable('session', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const authAttemptTable = pgTable('auth_attempt', {
  ipHash: text('ip_hash').primaryKey(),
  attempts: integer('attempts').notNull(),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const registrationOptionsSchema = z.object({
  code: z.string().max(MAXIMUM_BOOTSTRAP_CODE_LENGTH).optional(),
});

export const webauthnResponseSchema = z.object({ response: z.unknown() });

export const passkeyIdSchema = z.object({ id: z.uuid() });

export const registrationOptionsValidator = zValidator(
  'json',
  registrationOptionsSchema,
  rejectInvalidInput,
);

export const webauthnResponseValidator = zValidator(
  'json',
  webauthnResponseSchema,
  rejectInvalidInput,
);

export const passkeyIdValidator = zValidator('param', passkeyIdSchema, rejectInvalidInput);
