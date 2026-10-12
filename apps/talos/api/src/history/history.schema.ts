import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_WEEK_PATTERN = /^\d{4}-S\d{2}$/;

// @FollowsBlueprint schema-input-only
export const briefDateSchema = z.object({ date: z.string().regex(ISO_DATE_PATTERN) });
export const reviewWeekSchema = z.object({ week: z.string().regex(ISO_WEEK_PATTERN) });

export const briefDateValidator = zValidator('param', briefDateSchema, rejectInvalidInput);
export const reviewWeekValidator = zValidator('param', reviewWeekSchema, rejectInvalidInput);
