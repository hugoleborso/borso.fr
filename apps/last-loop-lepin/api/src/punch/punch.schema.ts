import { sql } from 'drizzle-orm';
import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { editionSlugSchema } from '../edition/edition.schema';
import { runnerSlugSchema } from '../runner/runner.schema';

// Foreign keys to `runners` are intentionally not declared. Aurora DSQL
// rejects `ALTER TABLE ADD CONSTRAINT` (drizzle-kit's FK emission shape),
// and the engine doesn't enforce FK semantics at write time anyway.
// App-level invariants are kept by the service layer.
export const loopPunchesTable = pgTable(
  'loop_punches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionSlug: text('edition_slug').notNull(),
    runnerSlug: text('runner_slug').notNull(),
    loopIndex: integer('loop_index').notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }).notNull(),
    correctedAt: timestamp('corrected_at', { withTimezone: true, mode: 'date' }),
    voidedAt: timestamp('voided_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    activePunchUnique: uniqueIndex('loop_punches_active_uq')
      .on(table.editionSlug, table.runnerSlug, table.loopIndex)
      .where(sql`voided_at IS NULL`),
  }),
);

export const manualDnfsTable = pgTable(
  'manual_dnfs',
  {
    editionSlug: text('edition_slug').notNull(),
    runnerSlug: text('runner_slug').notNull(),
    outAtLoop: integer('out_at_loop').notNull(),
    reason: text('reason').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.editionSlug, table.runnerSlug] }),
  }),
);

export const createPunchInputSchema = z.object({
  editionSlug: editionSlugSchema,
  runnerSlug: runnerSlugSchema,
});

export const correctPunchInputSchema = z.object({
  finishedAt: z.string().datetime({ offset: true }),
});

export const createDnfInputSchema = z.object({
  editionSlug: editionSlugSchema,
  runnerSlug: runnerSlugSchema,
  outAtLoop: z.number().int().positive(),
  reason: z.enum(['late', 'manual']),
});
