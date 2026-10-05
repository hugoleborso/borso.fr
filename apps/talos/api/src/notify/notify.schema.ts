import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

const MAXIMUM_TITLE_LENGTH = 200;
const MAXIMUM_MESSAGE_LENGTH = 2000;
const MAXIMUM_URL_LENGTH = 500;
const SITE_PATH_PATTERN = /^\/(?!\/)/;

// @FollowsBlueprint schema-input-only
export const notifySchema = z.object({
  title: z.string().trim().min(1).max(MAXIMUM_TITLE_LENGTH),
  message: z.string().trim().min(1).max(MAXIMUM_MESSAGE_LENGTH),
  urgent: z.boolean().optional(),
  url: z.string().max(MAXIMUM_URL_LENGTH).regex(SITE_PATH_PATTERN).optional(),
});

export const notifyValidator = zValidator('json', notifySchema, rejectInvalidInput);
