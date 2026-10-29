import { z } from 'zod';

const PAGE_LIMIT_MAX = 200;
const REFERENCE_MAX_LENGTH = 200;

export const referenceSchema = z.string().trim().min(1);

export const pageInputShape = {
  limit: z.number().int().min(1).max(PAGE_LIMIT_MAX).optional(),
  cursor: z.string().max(REFERENCE_MAX_LENGTH).optional(),
};

export const detailInputShape = {
  detail: z.boolean().optional(),
};

export const namedLineupSchema = z.record(
  referenceSchema,
  z.union([referenceSchema, z.array(referenceSchema), z.null()]),
);
