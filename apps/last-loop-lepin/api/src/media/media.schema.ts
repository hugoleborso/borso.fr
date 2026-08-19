import { z } from 'zod';
import { editionSlugSchema } from '../edition/edition.schema';
import { runnerSlugSchema } from '../runner/runner.schema';
import { PHOTO_CONTENT_TYPES } from './media.core';

// @FollowsBlueprint schema-shared-slug
export const presignInputSchema = z.object({
  editionSlug: editionSlugSchema,
  runnerSlug: runnerSlugSchema,
  contentType: z.enum(PHOTO_CONTENT_TYPES),
});
