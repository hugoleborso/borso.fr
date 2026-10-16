import { isoDateSchema } from '@domain/todo.core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';
import { DEFAULT_CONTEXT_BUDGET_BYTES } from '../memory/memory-context.core';
import { changeRequestSchema } from '../memory/memory-changes.schema';

const MAXIMUM_SEARCH_RESULTS = 50;
const DEFAULT_SEARCH_RESULTS = 20;
const MAXIMUM_GRAPH_DEPTH = 3;
const MAXIMUM_CONTEXT_BUDGET_BYTES = 2_000_000;
const MAXIMUM_QUERY_LENGTH = 20_000;
const slugSchema = z.string().min(1).max(500);

// @FollowsBlueprint schema-input-only
export const contextQuerySchema = z.object({
  budget: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAXIMUM_CONTEXT_BUDGET_BYTES)
    .default(DEFAULT_CONTEXT_BUDGET_BYTES),
});

export const slugQuerySchema = z.object({ slug: slugSchema });

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(MAXIMUM_SEARCH_RESULTS).default(DEFAULT_SEARCH_RESULTS),
});

export const neighboursQuerySchema = z.object({
  slug: slugSchema,
  date: isoDateSchema.optional(),
  depth: z.coerce.number().int().min(1).max(MAXIMUM_GRAPH_DEPTH).default(1),
});

export const pathQuerySchema = z.object({
  from: slugSchema,
  to: slugSchema,
  date: isoDateSchema.optional(),
});

export const sqlBodySchema = z.object({ query: z.string().min(1).max(MAXIMUM_QUERY_LENGTH) });

export const stateQuerySchema = z.object({ key: z.string().min(1).max(500) });

export const contextQueryValidator = zValidator('query', contextQuerySchema, rejectInvalidInput);
export const slugQueryValidator = zValidator('query', slugQuerySchema, rejectInvalidInput);
export const searchQueryValidator = zValidator('query', searchQuerySchema, rejectInvalidInput);
export const neighboursQueryValidator = zValidator(
  'query',
  neighboursQuerySchema,
  rejectInvalidInput,
);
export const pathQueryValidator = zValidator('query', pathQuerySchema, rejectInvalidInput);
export const sqlBodyValidator = zValidator('json', sqlBodySchema, rejectInvalidInput);
export const stateQueryValidator = zValidator('query', stateQuerySchema, rejectInvalidInput);
export const changeRequestValidator = zValidator('json', changeRequestSchema, rejectInvalidInput);
