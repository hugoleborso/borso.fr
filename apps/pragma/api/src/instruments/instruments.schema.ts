/**
 * Drizzle schema for the instruments bounded context. An instrument has
 * a name and a family — harmonic, percussive, vocal or other — and the
 * transition rule reads the family to decide who can carry the gap
 * between two songs.
 *
 * `family` is nullable at the database level because Aurora DSQL refuses
 * NOT NULL and DEFAULT on a column added after table creation (see
 * docs/knowledge/dsql-postgres-compat-gaps.md §10). The write side
 * always provides one and the read side narrows a null through the
 * legacy `is_harmonic` boolean, which DSQL also refuses to drop, so the
 * repository keeps it in sync rather than leaving it to rot.
 */

import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { INSTRUMENT_FAMILIES } from '@domain/instrument.core';

export const instrumentTable = pgTable('instrument', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  isHarmonic: boolean('is_harmonic').notNull().default(false),
  family: text('family'),
});

const instrumentNameSchema = z.string().trim().min(1).max(64);

export const instrumentFamilySchema = z.enum(INSTRUMENT_FAMILIES);

export const createInstrumentSchema = z.object({
  name: instrumentNameSchema,
  family: instrumentFamilySchema,
});

export const updateInstrumentSchema = z.object({
  name: instrumentNameSchema.optional(),
  family: instrumentFamilySchema.optional(),
});

export const instrumentIdParamSchema = z.object({ id: z.string().uuid() });
