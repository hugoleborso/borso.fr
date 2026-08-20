import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { INSTRUMENT_FAMILIES } from '@domain/instrument.core';

export const instrumentTable = pgTable('instrument', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  isHarmonic: boolean('is_harmonic').notNull().default(false),
  family: text('family'),
});

const INSTRUMENT_NAME_MAX = 64;

const instrumentNameSchema = z.string().trim().min(1).max(INSTRUMENT_NAME_MAX);

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
