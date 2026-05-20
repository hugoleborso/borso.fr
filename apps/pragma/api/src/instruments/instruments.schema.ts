/**
 * Drizzle schema for the instruments bounded context. An instrument has
 * a name and an `isHarmonic` flag — the transition warning algorithm
 * uses the flag to decide whether keeping the instrument across two
 * songs counts as harmonic continuity.
 */

import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const instrumentTable = pgTable('instrument', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  isHarmonic: boolean('is_harmonic').notNull().default(false),
});

const instrumentNameSchema = z.string().trim().min(1).max(64);

export const createInstrumentSchema = z.object({
  name: instrumentNameSchema,
  isHarmonic: z.boolean(),
});

export const updateInstrumentSchema = z.object({
  name: instrumentNameSchema.optional(),
  isHarmonic: z.boolean().optional(),
});

export const instrumentIdParamSchema = z.object({ id: z.string().uuid() });
