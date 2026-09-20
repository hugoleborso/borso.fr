import { boolean, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { INSTRUMENT_FAMILIES, INSTRUMENT_ICONS } from '@domain/instrument.core';

export const instrumentTable = pgTable('instrument', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  isHarmonic: boolean('is_harmonic').notNull().default(false),
  family: text('family'),
  icon: text('icon'),
  position: integer('position'),
});

const INSTRUMENT_NAME_MAX = 64;
const INSTRUMENT_POSITION_MAX = 999;

const instrumentNameSchema = z.string().trim().min(1).max(INSTRUMENT_NAME_MAX);

export const instrumentFamilySchema = z.enum(INSTRUMENT_FAMILIES);

export const instrumentIconSchema = z.enum(INSTRUMENT_ICONS);

export const instrumentPositionSchema = z.number().int().min(0).max(INSTRUMENT_POSITION_MAX);

export const createInstrumentSchema = z.object({
  name: instrumentNameSchema,
  family: instrumentFamilySchema,
  icon: instrumentIconSchema.optional(),
  position: instrumentPositionSchema.optional(),
});

export const updateInstrumentSchema = z.object({
  name: instrumentNameSchema.optional(),
  family: instrumentFamilySchema.optional(),
  icon: instrumentIconSchema.optional(),
  position: instrumentPositionSchema.optional(),
});

export const instrumentOrderSchema = z.object({
  instrumentIds: z.array(z.string().uuid()),
});

export const instrumentIdParamSchema = z.object({ id: z.string().uuid() });
