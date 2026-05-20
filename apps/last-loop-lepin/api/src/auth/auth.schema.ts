import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const authAttemptsTable = pgTable('auth_attempts', {
  ipAddress: text('ip_address').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

/**
 * Single-row table holding the admin PIN scrypt hash. There's exactly one
 * administrator on this app; the operator seeds the row after the first
 * deploy via `psql` (`INSERT INTO admin_credentials …`) and rotates with
 * a plain `UPDATE`. Replaces the Secrets Manager secret
 * `last-loop-lepin/admin-pin-hash` ($0.40/mo, now $0).
 */
export const adminCredentialsTable = pgTable('admin_credentials', {
  id: integer('id').primaryKey(),
  scryptHash: text('scrypt_hash').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

/**
 * Active admin sessions. The cookie carries an opaque random id; each
 * authenticated request looks up the row and rejects when it's missing
 * or `expires_at < now()`. Replaces the JWT signing flow (which required
 * a Secrets Manager-hosted `JWT_SECRET` at $0.40/mo/stage) and gives us
 * server-side logout for free — DELETE the row, the cookie is dead.
 */
export const adminSessionsTable = pgTable('admin_sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const loginInputSchema = z.object({
  pin: z.string().min(4).max(32),
});
