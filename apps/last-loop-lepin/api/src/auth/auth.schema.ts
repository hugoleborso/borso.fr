import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const authAttemptsTable = pgTable('auth_attempts', {
  ipAddress: text('ip_address').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const loginInputSchema = z.object({
  pin: z.string().min(4).max(32),
});
