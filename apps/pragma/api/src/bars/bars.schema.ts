import {
  BAR_CAPACITY_MAX,
  BAR_CITY_MAX_LENGTH,
  BAR_CONTACT_NAME_MAX_LENGTH,
  BAR_CONTACT_PHONE_MAX_LENGTH,
  BAR_NAME_MAX_LENGTH,
  BAR_NOTES_MAX_LENGTH,
  BAR_STATUSES,
} from '@domain/bar-profile.core';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { availableSupportSchema, concertMoodSchema } from './bar-support.core';

/**
 * @Blueprint schema-table-and-input
 * @BlueprintName Schema With Table And Input
 * @BlueprintUsage Use for a slice that owns a table, so its Drizzle definition and its Zod input schemas live in one file.
 * @BlueprintDescription Declares the table, the status list, and the create schema, then derives the update schema with `.partial()` so a new field cannot be added to one and forgotten in the other. `BarStatus` is derived from the same status list the enum reads, which turns an unknown status into a type error rather than a runtime surprise.
 */
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
  ownerMemberId: uuid('owner_member_id'),
  concertMood: text('concert_mood'),
  availableSupport: text('available_support'),
});

export const barCreateSchema = z.object({
  name: z.string().trim().min(1).max(BAR_NAME_MAX_LENGTH),
  status: z.enum(BAR_STATUSES),
  notes: z.string().max(BAR_NOTES_MAX_LENGTH).default(''),
  lastInteractionAt: z.string().datetime().nullable().default(null),
  city: z.string().max(BAR_CITY_MAX_LENGTH).nullable().default(null),
  capacity: z.number().int().min(0).max(BAR_CAPACITY_MAX).nullable().default(null),
  contactName: z.string().max(BAR_CONTACT_NAME_MAX_LENGTH).nullable().default(null),
  contactEmail: z.string().email().nullable().default(null),
  contactPhone: z.string().max(BAR_CONTACT_PHONE_MAX_LENGTH).nullable().default(null),
  ownerMemberId: z.string().uuid().nullable().default(null),
  concertMood: concertMoodSchema.nullable().default(null),
  availableSupport: availableSupportSchema.default([]),
});

export const barUpdateSchema = barCreateSchema.partial();
const SEARCH_QUERY_MAX = 256;

export const barSearchQuerySchema = z.object({
  query: z.string().trim().min(1).max(SEARCH_QUERY_MAX),
});

export const barIdParamSchema = z.object({ id: z.string().uuid() });
