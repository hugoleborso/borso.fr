import { z } from 'zod';
import { PHOTO_CONTENT_TYPES } from './media.core';

const MIN_EDITION_SLUG_LENGTH = 3;
const MIN_RUNNER_SLUG_LENGTH = 2;
const MAX_SLUG_LENGTH = 64;

export const presignInputSchema = z.object({
  editionSlug: z.string().min(MIN_EDITION_SLUG_LENGTH).max(MAX_SLUG_LENGTH),
  runnerSlug: z.string().min(MIN_RUNNER_SLUG_LENGTH).max(MAX_SLUG_LENGTH),
  contentType: z.enum(PHOTO_CONTENT_TYPES),
});
