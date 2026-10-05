import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

const MAXIMUM_MESSAGE_LENGTH = 5000;

// @FollowsBlueprint schema-input-only
export const messageSchema = z.object({
  text: z.string().trim().min(1).max(MAXIMUM_MESSAGE_LENGTH),
});

export const messageValidator = zValidator('json', messageSchema, rejectInvalidInput);
