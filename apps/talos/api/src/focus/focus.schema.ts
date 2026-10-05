import { focusItemsSchema } from '@domain/focus.core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

// @FollowsBlueprint schema-input-only
export const focusUpdateSchema = z.object({ items: focusItemsSchema });

export const focusUpdateValidator = zValidator('json', focusUpdateSchema, rejectInvalidInput);
