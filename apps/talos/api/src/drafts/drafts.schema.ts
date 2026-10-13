import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';
import { DRAFT_STATUS_CHANGES } from '@domain/draft-status.core';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const MAXIMUM_SLUG_LENGTH = 120;

// @FollowsBlueprint schema-input-only
export const draftSlugSchema = z.object({
  slug: z.string().max(MAXIMUM_SLUG_LENGTH).regex(SLUG_PATTERN),
});

export const draftStatusChangeSchema = z.object({ status: z.enum(DRAFT_STATUS_CHANGES) });

export const draftSlugValidator = zValidator('param', draftSlugSchema, rejectInvalidInput);
export const draftStatusChangeValidator = zValidator(
  'json',
  draftStatusChangeSchema,
  rejectInvalidInput,
);
