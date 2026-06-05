/**
 * Drizzle schema for the bars (CRM) bounded context. Status mirrors the
 * spec BarStatus enum: `lead | contacted | booked | played | cold`.
 * Extension fields (city, capacity, contactName, contactEmail,
 * contactPhone) are not in spec.md but the v1 surface needs them.
 */

import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const BAR_STATUSES = ['lead', 'contacted', 'booked', 'played', 'cold'] as const;

export const barTable = pgTable('bar', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  status: text('status').notNull(),
  notes: text('notes').notNull().default(''),
  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true, mode: 'date' }),
  city: text('city'),
  capacity: integer('capacity'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
});

export const barCreateSchema = z.object({
  name: z.string().trim().min(1).max(256),
  status: z.enum(BAR_STATUSES),
  notes: z.string().max(8_192).default(''),
  lastInteractionAt: z.string().datetime().nullable().default(null),
  city: z.string().max(128).nullable().default(null),
  capacity: z.number().int().min(0).max(100_000).nullable().default(null),
  contactName: z.string().max(128).nullable().default(null),
  contactEmail: z.string().email().nullable().default(null),
  contactPhone: z.string().max(32).nullable().default(null),
});

export const barUpdateSchema = barCreateSchema.partial();
export const barIdParamSchema = z.object({ id: z.string().uuid() });

export type BarStatus = (typeof BAR_STATUSES)[number];
