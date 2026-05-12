import { integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { editionSlugSchema, editionsTable } from '../edition/edition.schema';

export const runnersTable = pgTable(
  'runners',
  {
    editionSlug: text('edition_slug')
      .notNull()
      .references(() => editionsTable.slug),
    slug: text('slug').notNull(),
    displayName: text('display_name').notNull(),
    photoKey: text('photo_key'),
    bib: integer('bib'),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.editionSlug, table.slug] }),
  }),
);

export const runnerSlugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9-]+$/, 'lowercase letters, digits and dashes only');

export const createRunnerInputSchema = z.object({
  editionSlug: editionSlugSchema,
  slug: runnerSlugSchema,
  displayName: z.string().min(1).max(120),
  photoKey: z.string().min(1).max(255).nullable().optional(),
  bib: z.number().int().positive().max(9999).nullable().optional(),
});
