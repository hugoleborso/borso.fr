import {
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { editionSlugSchema } from '../edition/edition.schema';
import { runnerSlugSchema } from '../runner/runner.schema';

/**
 * @Blueprint schema-dsql-constraints
 * @BlueprintName Schema With DSQL Constraints Written Down
 * @BlueprintUsage Use for a table on Aurora DSQL, so every constraint the engine refuses carries an application level guard instead of a database one.
 * @BlueprintDescription Declares the table without the foreign keys and the partial unique index Aurora DSQL rejects, and leaves the rules they would have held to the slice's own code, where `validatePunchTiming` keeps one punch per runner and loop. The engine gaps are listed in docs/knowledge/dsql-postgres-compat-gaps.md and the invariants in the application's VOCABULARY.md.
 */
export const loopPunchesTable = pgTable('loop_punches', {
  id: uuid('id').primaryKey().defaultRandom(),
  editionSlug: text('edition_slug').notNull(),
  runnerSlug: text('runner_slug').notNull(),
  loopIndex: integer('loop_index').notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }).notNull(),
  correctedAt: timestamp('corrected_at', { withTimezone: true, mode: 'date' }),
  voidedAt: timestamp('voided_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  source: text('source'),
  clientLat: doublePrecision('client_lat'),
  clientLng: doublePrecision('client_lng'),
  clientAccuracyM: doublePrecision('client_accuracy_m'),
  distanceFromCenterM: doublePrecision('distance_from_center_m'),
  userAgent: text('user_agent'),
});

export const manualDidNotFinishesTable = pgTable(
  'manual_dnfs',
  {
    editionSlug: text('edition_slug').notNull(),
    runnerSlug: text('runner_slug').notNull(),
    outAtLoop: integer('out_at_loop').notNull(),
    reason: text('reason').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.editionSlug, table.runnerSlug] })],
);

export const createPunchInputSchema = z.object({
  editionSlug: editionSlugSchema,
  runnerSlug: runnerSlugSchema,
});

export const correctPunchInputSchema = z.object({
  finishedAt: z.string().datetime({ offset: true }),
});

const MAX_LATITUDE_DEGREES = 90;
const MAX_LONGITUDE_DEGREES = 180;

export const catchupPunchInputSchema = z.object({
  editionSlug: editionSlugSchema,
  runnerSlug: runnerSlugSchema,
  loopIndex: z.number().int().positive(),
});

export const selfPunchInputSchema = z.object({
  editionSlug: editionSlugSchema,
  runnerSlug: runnerSlugSchema,
  clientLat: z.number().min(-MAX_LATITUDE_DEGREES).max(MAX_LATITUDE_DEGREES).nullable(),
  clientLng: z.number().min(-MAX_LONGITUDE_DEGREES).max(MAX_LONGITUDE_DEGREES).nullable(),
  clientAccuracyM: z.number().nonnegative().nullable(),
});

export const createDidNotFinishInputSchema = z.object({
  editionSlug: editionSlugSchema,
  runnerSlug: runnerSlugSchema,
  outAtLoop: z.number().int().nonnegative(),
  reason: z.enum(['late', 'manual']),
});
