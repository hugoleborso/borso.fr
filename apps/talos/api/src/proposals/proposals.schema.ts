import {
  MAXIMUM_DECISION_COMMENT_LENGTH,
  MAXIMUM_DECISION_OPTION_LENGTH,
  PROPOSAL_DECISIONS,
} from '@domain/proposal.core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const MAXIMUM_SLUG_LENGTH = 120;
const MAXIMUM_STATUS_LENGTH = 30;

// @FollowsBlueprint schema-input-only
export const proposalStatusQuerySchema = z.object({
  status: z.string().max(MAXIMUM_STATUS_LENGTH).optional(),
});

export const proposalSlugSchema = z.object({
  slug: z.string().max(MAXIMUM_SLUG_LENGTH).regex(SLUG_PATTERN),
});

export const proposalDecisionSchema = z.object({
  decision: z.enum(PROPOSAL_DECISIONS),
  option: z.string().max(MAXIMUM_DECISION_OPTION_LENGTH).optional(),
  comment: z.string().max(MAXIMUM_DECISION_COMMENT_LENGTH).optional(),
});

export const proposalStatusQueryValidator = zValidator(
  'query',
  proposalStatusQuerySchema,
  rejectInvalidInput,
);
export const proposalSlugValidator = zValidator('param', proposalSlugSchema, rejectInvalidInput);
export const proposalDecisionValidator = zValidator(
  'json',
  proposalDecisionSchema,
  rejectInvalidInput,
);
