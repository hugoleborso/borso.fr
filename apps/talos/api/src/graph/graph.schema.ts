import { isoDateSchema } from '@domain/todo.core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

// @FollowsBlueprint schema-input-only
export const graphQuerySchema = z.object({ date: isoDateSchema.optional() });

export const graphQueryValidator = zValidator('query', graphQuerySchema, rejectInvalidInput);
