/**
 * Drizzle schema for the songs (catalog) bounded context. JSONB blobs
 * (`links`, `chart`, `default_lineup`) are validated via Zod at the
 * controller boundary; this file holds both the Drizzle table and the
 * Zod input schemas the controller defers to.
 */

import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const SONG_STATUSES = ['idea', 'wip', 'rehearsed', 'concert_ready'] as const;
export const LINK_PROVIDERS = ['spotify', 'deezer', 'youtube', 'other'] as const;
export const ENERGY_MIN = 1;
export const ENERGY_MAX = 10;

export const songTable = pgTable('song', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  artist: text('artist').notNull().default(''),
  status: text('status').notNull(),
  links: jsonb('links').notNull().default([]),
  chart: jsonb('chart'),
  tonalityStart: text('tonality_start'),
  tonalityEnd: text('tonality_end'),
  defaultLineup: jsonb('default_lineup').notNull().default({}),
  // baseEnergy is the "what energy does this song carry on average"
  // hint; the per-entry energy on setlist_entry overrides it for the
  // sparkline.
  baseEnergy: integer('base_energy'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const songExternalLinkSchema = z.object({
  url: z.string().url(),
  provider: z.enum(LINK_PROVIDERS),
  comment: z.string().max(2_048).default(''),
});

export const chordChartSchema = z.union([
  z.object({ kind: z.literal('chordpro'), text: z.string().min(1).max(64_000) }),
  z.object({ kind: z.literal('pdf'), s3Key: z.string().min(1).max(512) }),
  z.object({ kind: z.literal('image'), s3Key: z.string().min(1).max(512) }),
]);

export const defaultLineupSchema = z.record(z.string().uuid(), z.string().uuid().nullable());

const songBaseSchema = z.object({
  title: z.string().trim().min(1).max(256),
  artist: z.string().trim().max(256).default(''),
  status: z.enum(SONG_STATUSES),
  links: z.array(songExternalLinkSchema).max(16).default([]),
  chart: chordChartSchema.nullable().default(null),
  tonalityStart: z.string().max(16).nullable().default(null),
  tonalityEnd: z.string().max(16).nullable().default(null),
  defaultLineup: defaultLineupSchema.default({}),
  baseEnergy: z.number().int().min(ENERGY_MIN).max(ENERGY_MAX).nullable().default(null),
});

export const songCreateInputSchema = songBaseSchema;
export const songUpdateInputSchema = songBaseSchema.partial();
export const songIdParamSchema = z.object({ id: z.string().uuid() });
