import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

const MAXIMUM_PAGE_PATH_LENGTH = 300;

// @FollowsBlueprint schema-input-only
export const pagePathSchema = z.object({ path: z.string().min(1).max(MAXIMUM_PAGE_PATH_LENGTH) });

export const pagePathValidator = zValidator('param', pagePathSchema, rejectInvalidInput);
