/**
 * Drizzle schema for the auth bounded context.
 *
 * Singleton row carrying the shared-password argon2id hash + the HMAC
 * signing key for session cookies. See ADR-0004. The `id = 1` constraint
 * is the singleton guard. Auth-attempts table holds per-ip-hash sliding
 * windows used by the rate limiter.
 */

import { customType, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Drizzle ships no first-class `bytea` type; declare one. Stored as
// raw bytes; read/written as `Buffer` (Node) or `Uint8Array` after
// `Buffer.from` in tests.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

export const appConfigTable = pgTable('app_config', {
  id: integer('id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  hmacKey: bytea('hmac_key').notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const authAttemptTable = pgTable('auth_attempt', {
  ipHash: text('ip_hash').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true, mode: 'date' }).notNull(),
});
