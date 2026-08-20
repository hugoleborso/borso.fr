import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { isMonotonicZeroToOne } from './edition.schema.utils';
import type { EditionStatus, GpxMetadata } from './edition.types';

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

const pointTimeFractionsSchema = z.array(z.number()).refine(isMonotonicZeroToOne, {
  message: 'pointTimeFractions must be strictly monotonic, start at 0 and end at 1',
});

const pointElevationsSchema = z.array(z.number().finite());

const trackJsonSchema = z
  .object({
    points: z.array(latLngSchema),
    pointTimeFractions: pointTimeFractionsSchema.optional(),
    pointElevations: pointElevationsSchema.optional(),
  })
  .refine(
    (trackJson) =>
      trackJson.pointTimeFractions === undefined ||
      trackJson.pointTimeFractions.length === trackJson.points.length,
    { message: 'pointTimeFractions.length must match points.length' },
  )
  .refine(
    (trackJson) =>
      trackJson.pointElevations === undefined ||
      trackJson.pointElevations.length === trackJson.points.length,
    { message: 'pointElevations.length must match points.length' },
  );

export const gpxMetadataSchema: z.ZodType<GpxMetadata> = z.object({
  distanceMeters: z.number(),
  elevationGainMeters: z.number(),
  trackJson: trackJsonSchema,
  startLatLng: latLngSchema,
});

const editionStatusValues: ReadonlySet<string> = new Set(['setup', 'live', 'finished']);

const DEFAULT_INTERVAL_MINUTES = 60;
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 240;
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 64;
const DISPLAY_NAME_MAX_LENGTH = 120;

export function isEditionStatus(value: unknown): value is EditionStatus {
  return typeof value === 'string' && editionStatusValues.has(value);
}

// @FollowsBlueprint schema-dsql-constraints
export const editionsTable = pgTable('editions', {
  slug: text('slug').primaryKey(),
  displayName: text('display_name').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }).notNull(),
  sunriseAt: timestamp('sunrise_at', { withTimezone: true, mode: 'date' }).notNull(),
  sunsetAt: timestamp('sunset_at', { withTimezone: true, mode: 'date' }).notNull(),
  intervalMinutes: integer('interval_min').notNull().default(DEFAULT_INTERVAL_MINUTES),
  gpx: text('gpx').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

/**
 * @Blueprint schema-shared-slug
 * @BlueprintName Shared Slug Schema
 * @BlueprintUsage Use for an identifier several slices validate, so the owning slice declares the rule once and the others import it.
 * @BlueprintDescription Declares the edition slug's length and character rules as one exported Zod schema in the slice that owns the table, which `punch.schema.ts` and `runner.schema.ts` then import instead of restating the regular expression.
 */
export const editionSlugSchema = z
  .string()
  .min(SLUG_MIN_LENGTH)
  .max(SLUG_MAX_LENGTH)
  .regex(/^[a-z0-9-]+$/, 'lowercase letters, digits and dashes only');

export const createEditionInputSchema = z.object({
  slug: editionSlugSchema,
  displayName: z.string().min(1).max(DISPLAY_NAME_MAX_LENGTH),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  intervalMinutes: z.number().int().min(MIN_INTERVAL_MINUTES).max(MAX_INTERVAL_MINUTES).optional(),
  gpxXml: z.string().min(1),
});

export const updateEditionInputSchema = createEditionInputSchema
  .omit({ slug: true })
  .extend({ gpxXml: z.string().min(1).optional() });

export const editionStatusUpdateSchema = z.object({
  status: z.enum(['setup', 'live', 'finished']),
});
