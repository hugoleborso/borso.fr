/** @Feature auth */

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '@domain/input-limits.core';
import { z } from 'zod';

// @FollowsBlueprint core-form-schema
export const credentialsFormSchema = z.object({
  username: z.string().trim().min(USERNAME_MIN_LENGTH).max(USERNAME_MAX_LENGTH),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export type CredentialsFormValues = z.infer<typeof credentialsFormSchema>;

export function buildSignInPayload(values: CredentialsFormValues): CredentialsFormValues {
  return { username: values.username.trim().toLowerCase(), password: values.password };
}
