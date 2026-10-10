import { integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { SLUG_CHARACTERS_PATTERN } from '@domain/edition-limits.core';
import { MAXIMUM_BIB, MAXIMUM_RUNNER_NAME_LENGTH, MINIMUM_BIB } from '@domain/runner-limits.core';
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
const PHOTO_KEY_MAX_LENGTH = 255;

// @FollowsBlueprint schema-shared-slug
export const runnerSlugSchema = z
  .string()
  .min(SLUG_MIN_LENGTH)
  .max(SLUG_MAX_LENGTH)
  .regex(SLUG_CHARACTERS_PATTERN, 'lowercase letters, digits and dashes only');

export const createRunnerInputSchema = z.object({
  editionSlug: editionSlugSchema,
  slug: runnerSlugSchema,
  displayName: z.string().min(1).max(MAXIMUM_RUNNER_NAME_LENGTH),
  photoKey: z.string().min(1).max(PHOTO_KEY_MAX_LENGTH).nullable().optional(),
  bib: z.number().int().min(MINIMUM_BIB).max(MAXIMUM_BIB),
});
