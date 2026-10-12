import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

const MAXIMUM_QUERY_LENGTH = 200;

// @FollowsBlueprint schema-input-only
export const searchQuerySchema = z.object({ q: z.string().max(MAXIMUM_QUERY_LENGTH) });

export const searchQueryValidator = zValidator('query', searchQuerySchema, rejectInvalidInput);
