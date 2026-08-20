import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const authAttemptsTable = pgTable('auth_attempts', {
  ipAddress: text('ip_address').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const adminCredentialsTable = pgTable('admin_credentials', {
  id: integer('id').primaryKey(),
  scryptHash: text('scrypt_hash').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const adminSessionsTable = pgTable('admin_sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 32;

export const loginInputSchema = z.object({
  pin: z.string().min(PIN_MIN_LENGTH).max(PIN_MAX_LENGTH),
});
