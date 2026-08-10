/**
 * The administrator sign in form's rules. The schema mirrors
 * `loginInputSchema` in `api/src/auth/auth.schema.ts`; it is restated because
 * that file also declares the Drizzle tables.
 */

import { z } from 'zod';

export const PIN_INPUT_ID = 'admin-pin';

const MINIMUM_PIN_LENGTH = 4;
const MAXIMUM_PIN_LENGTH = 32;

export const adminLoginSchema = z.object({
  pin: z.string().min(MINIMUM_PIN_LENGTH).max(MAXIMUM_PIN_LENGTH),
});
