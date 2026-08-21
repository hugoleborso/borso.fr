import { integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { editionSlugSchema } from '../edition/edition.schema';

// @FollowsBlueprint schema-dsql-constraints
export const runnersTable = pgTable(
  'runners',
  {
    editionSlug: text('edition_slug').notNull(),
    slug: text('slug').notNull(),
    displayName: text('display_name').notNull(),
    photoKey: text('photo_key'),
    bib: integer('bib'),
  },
  (table) => [primaryKey({ columns: [table.editionSlug, table.slug] })],
);

const SLUG_MIN_LENGTH = 2;
const SLUG_MAX_LENGTH = 64;
const DISPLAY_NAME_MAX_LENGTH = 120;
const PHOTO_KEY_MAX_LENGTH = 255;
const MAX_BIB_NUMBER = 9_999;

// @FollowsBlueprint schema-shared-slug
export const runnerSlugSchema = z
  .string()
  .min(SLUG_MIN_LENGTH)
  .max(SLUG_MAX_LENGTH)
  .regex(/^[a-z0-9-]+$/, 'lowercase letters, digits and dashes only');

export const createRunnerInputSchema = z.object({
  editionSlug: editionSlugSchema,
  slug: runnerSlugSchema,
  displayName: z.string().min(1).max(DISPLAY_NAME_MAX_LENGTH),
  photoKey: z.string().min(1).max(PHOTO_KEY_MAX_LENGTH).nullable().optional(),
  bib: z.number().int().positive().max(MAX_BIB_NUMBER),
});
