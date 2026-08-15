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

// Foreign keys to `runners` are intentionally not declared. Aurora DSQL
// rejects `ALTER TABLE ADD CONSTRAINT` (drizzle-kit's FK emission shape),
// and the engine doesn't enforce FK semantics at write time anyway.
// App-level invariants are kept by the service layer.
//
// The previous partial unique index `(edition_slug, runner_slug, loop_index)
// WHERE voided_at IS NULL` is gone too: DSQL doesn't support partial
// indexes (`WHERE not supported for CREATE INDEX`) and a full unique on
// the same columns would block the void-then-re-punch flow. The
// re-punch guard now lives entirely in `validatePunchTiming` (app side).
/**
 * @Blueprint schema-dsql-constraints
 * @BlueprintName Schema With DSQL Constraints Written Down
 * @BlueprintUsage Use for a table on Aurora DSQL, so every constraint the engine refuses is recorded beside the column with the guard that replaces it.
 * @BlueprintDescription Declares the table without the foreign keys and the partial unique index DSQL rejects, and names in the surrounding comments both what was refused and where the application level replacement lives, so a reader does not take the missing constraint for an oversight and reintroduce it.
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
  // `source` stays nullable at the DB level — DSQL rejects ALTER TABLE
  // post-creation NOT NULL/DEFAULT (cf. docs/knowledge/dsql-postgres-compat-gaps.md §10).
  // The app-level narrow lives in `punch.repository.ts:narrowPunchSource`.
  // No IP column by design (cf. spec Q.O.D. Q8 option (d)).
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
  // 0 = the runner didn't even close the first loop (the system projects
  // them as `dnf:late` with `outAtLoop = 0`, and the orga may also mark a
  // pre-race abandon by hand). Anything below 0 is meaningless.
  outAtLoop: z.number().int().nonnegative(),
  reason: z.enum(['late', 'manual']),
});
