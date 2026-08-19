import { integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { editionSlugSchema } from '../edition/edition.schema';

// Foreign keys are intentionally absent from this schema. Aurora DSQL
// doesn't accept `ALTER TABLE ADD CONSTRAINT` (which is how drizzle-kit
// emits FK constraints), and even when accepted, DSQL doesn't enforce
// them at write time. App-level invariants (don't insert a punch without
// a runner first) are maintained by the service layer.
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

// `bib` is mandatory at the API boundary — the orga always knows the
// dossard before the runner steps on the start line, and downstream UI
// (Pointage, Mur des éliminés) reads it as "this is the runner". The DB
// column stays nullable to keep migrations cheap and to leave the door
// open for historical imports that have no bib.
export const createRunnerInputSchema = z.object({
  editionSlug: editionSlugSchema,
  slug: runnerSlugSchema,
  displayName: z.string().min(1).max(DISPLAY_NAME_MAX_LENGTH),
  photoKey: z.string().min(1).max(PHOTO_KEY_MAX_LENGTH).nullable().optional(),
  bib: z.number().int().positive().max(MAX_BIB_NUMBER),
});
