import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@domain/input-limits.core';
import { customType, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

// @FollowsBlueprint schema-table-and-input
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

export const credentialsSchema = z.object({
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});
