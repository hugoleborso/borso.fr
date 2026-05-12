import { sql } from 'drizzle-orm';
import {
  foreignKey,
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
import { runnerSlugSchema, runnersTable } from '../runner/runner.schema';

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
    runnerFk: foreignKey({
      columns: [table.editionSlug, table.runnerSlug],
      foreignColumns: [runnersTable.editionSlug, runnersTable.slug],
    }),
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
    runnerFk: foreignKey({
      columns: [table.editionSlug, table.runnerSlug],
      foreignColumns: [runnersTable.editionSlug, runnersTable.slug],
    }),
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
