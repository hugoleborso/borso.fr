import { isSignInPassword } from '@domain/sign-in.core';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// @FollowsBlueprint schema-dsql-constraints
export const operatorCredentialTable = pgTable('operator_credential', {
  id: uuid('id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  sessionEpoch: integer('session_epoch').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const appConfigTable = pgTable('app_config', {
  id: text('id').primaryKey(),
  hmacKey: text('hmac_key').notNull(),
});

export const signInAttemptTable = pgTable('sign_in_attempt', {
  addressHash: text('address_hash').primaryKey(),
  attemptCount: integer('attempt_count').notNull(),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true, mode: 'date' }).notNull(),
});

// @FollowsBlueprint schema-table-and-input
export const signInSchema = z.object({
  password: z.string().refine(isSignInPassword),
});
