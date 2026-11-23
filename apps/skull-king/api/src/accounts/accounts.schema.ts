import { customType, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { PLAYER_COLORS, PLAYER_ICONS, PLAYER_NAME_MAX_LENGTH } from '@domain/player-mark.core';

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

// @FollowsBlueprint schema-table-and-input
export const accountTable = pgTable('account', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon', { enum: PLAYER_ICONS }).notNull(),
  color: text('color', { enum: PLAYER_COLORS }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const passkeyTable = pgTable('passkey', {
  credentialId: text('credential_id').primaryKey(),
  accountId: uuid('account_id').notNull(),
  publicKey: bytea('public_key').notNull(),
  counter: integer('counter').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const webauthnChallengeTable = pgTable('webauthn_challenge', {
  challenge: text('challenge').primaryKey(),
  accountId: uuid('account_id'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const appSecretTable = pgTable('app_secret', {
  id: integer('id').primaryKey(),
  hmacKey: bytea('hmac_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

const nameSchema = z.string().trim().min(1).max(PLAYER_NAME_MAX_LENGTH);

export const registrationOptionsSchema = z.object({ name: nameSchema }).strict();

export const registrationSchema = z
  .object({
    name: nameSchema,
    icon: z.enum(PLAYER_ICONS),
    color: z.enum(PLAYER_COLORS),
    response: z.unknown(),
  })
  .strict();

export const signInSchema = z.object({ response: z.unknown() }).strict();

export type RegistrationInput = z.infer<typeof registrationSchema>;
