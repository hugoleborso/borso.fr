import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import type { EditionStatus, GpxMetadata } from './edition.types';

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

export const gpxMetadataSchema: z.ZodType<GpxMetadata> = z.object({
  distanceMeters: z.number(),
  elevationGainMeters: z.number(),
  trackJson: z.object({ points: z.array(latLngSchema) }),
  startLatLng: latLngSchema,
});

const editionStatusValues: ReadonlySet<string> = new Set(['setup', 'live', 'finished']);

export function isEditionStatus(value: unknown): value is EditionStatus {
  return typeof value === 'string' && editionStatusValues.has(value);
}

export const editionsTable = pgTable('editions', {
  slug: text('slug').primaryKey(),
  displayName: text('display_name').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }).notNull(),
  sunriseAt: timestamp('sunrise_at', { withTimezone: true, mode: 'date' }).notNull(),
  sunsetAt: timestamp('sunset_at', { withTimezone: true, mode: 'date' }).notNull(),
  intervalMinutes: integer('interval_min').notNull().default(60),
  // Aurora DSQL doesn't support `jsonb`. The GPX metadata is stored as
  // JSON-encoded text and parsed via `gpxMetadataSchema` at the repository
  // boundary, which doubles as runtime validation.
  gpx: text('gpx').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const editionSlugSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9-]+$/, 'lowercase letters, digits and dashes only');

export const createEditionInputSchema = z.object({
  slug: editionSlugSchema,
  displayName: z.string().min(1).max(120),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  gpxXml: z.string().min(1),
});
