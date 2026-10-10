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
 * @BlueprintUsage Use for a table on Aurora DSQL whose rows carry a uniqueness rule the engine will not hold as a partial unique index or a foreign key.
 * @BlueprintDescription Declares the punch table without the foreign keys and the partial unique index Aurora DSQL rejects, and holds the rule the partial index would have held, one active punch per runner and loop, with a second table whose primary key is exactly that triple. The claim row is written in the same transaction as the punch and deleted in the same transaction as the void, so the primary key refuses a second active punch from the first write. A check in application code cannot do that, because two requests can both pass it before either writes, and neither can a unique index, which Aurora DSQL builds asynchronously. The engine gaps are listed in docs/knowledge/dsql-postgres-compat-gaps.md and the invariants in the application's VOCABULARY.md.
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

export const loopPunchClaimsTable = pgTable(
  'loop_punch_claims',
  {
    editionSlug: text('edition_slug').notNull(),
    runnerSlug: text('runner_slug').notNull(),
    loopIndex: integer('loop_index').notNull(),
    punchId: uuid('punch_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.editionSlug, table.runnerSlug, table.loopIndex] })],
);

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
