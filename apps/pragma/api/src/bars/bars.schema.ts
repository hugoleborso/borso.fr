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
import { referenceSchema } from '../mcp/tool-input.schema';
import { availableSupportSchema, concertMoodSchema } from './bar-support.core';

/**
 * @Blueprint schema-table-and-input
 * @BlueprintName Schema With Table And Input
 * @BlueprintUsage Use for a slice that owns a table, so its Drizzle definition and its Zod input schemas live in one file.
 * @BlueprintDescription Declares the table, the status list, and the create schema, declares the fields once without defaults, then derives the create schema by adding the defaults and the update schema with `.partial()`, so a new field cannot be added to one and forgotten in the other. Zod 4 applies a `.default()` even inside `.partial()`, so a default in the shared fields would rewrite every field a patch leaves out. `BarStatus` is derived from the same status list the enum reads, which turns an unknown status into a type error rather than a runtime surprise.
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

const barFieldShape = {
  name: z.string().trim().min(1).max(BAR_NAME_MAX_LENGTH),
  status: z.enum(BAR_STATUSES),
  notes: z.string().max(BAR_NOTES_MAX_LENGTH),
  city: z.string().max(BAR_CITY_MAX_LENGTH).nullable(),
  capacity: z.number().int().min(0).max(BAR_CAPACITY_MAX).nullable(),
  contactName: z.string().max(BAR_CONTACT_NAME_MAX_LENGTH).nullable(),
  contactEmail: z.email().nullable(),
  contactPhone: z.string().max(BAR_CONTACT_PHONE_MAX_LENGTH).nullable(),
  ownerMemberId: z.guid().nullable(),
  concertMood: concertMoodSchema.nullable(),
  availableSupport: availableSupportSchema,
};

export const barCreateSchema = z.object({
  ...barFieldShape,
  notes: barFieldShape.notes.default(''),
  city: barFieldShape.city.default(null),
  capacity: barFieldShape.capacity.default(null),
  contactName: barFieldShape.contactName.default(null),
  contactEmail: barFieldShape.contactEmail.default(null),
  contactPhone: barFieldShape.contactPhone.default(null),
  ownerMemberId: barFieldShape.ownerMemberId.default(null),
  concertMood: barFieldShape.concertMood.default(null),
  availableSupport: barFieldShape.availableSupport.default([]),
});

export const barUpdateSchema = z.object(barFieldShape).partial();
const SEARCH_QUERY_MAX = 256;

export const barSearchQuerySchema = z.object({
  query: z.string().trim().min(1).max(SEARCH_QUERY_MAX),
});

export const barIdParamSchema = z.object({ id: z.guid() });
export const barReferenceToolInputSchema = z.object({ bar: referenceSchema });
export const barListToolInputSchema = z.object({
  query: z.string().max(SEARCH_QUERY_MAX).optional(),
  status: z.enum(BAR_STATUSES).optional(),
});
export const barSaveToolInputSchema = z
  .object({ bar: referenceSchema.optional() })
  .extend(barUpdateSchema.shape);
