import { z } from 'zod';

export const PIN_INPUT_ID = 'admin-pin';

const MINIMUM_PIN_LENGTH = 4;
const MAXIMUM_PIN_LENGTH = 32;

// @FollowsBlueprint core-form-schema
export const adminLoginSchema = z.object({
  pin: z.string().min(MINIMUM_PIN_LENGTH).max(MAXIMUM_PIN_LENGTH),
});
