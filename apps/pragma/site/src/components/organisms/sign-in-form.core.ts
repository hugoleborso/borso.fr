/** @Feature auth */

import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 256;
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 64;

// @FollowsBlueprint core-form-schema
export const credentialsFormSchema = z.object({
  username: z.string().trim().min(USERNAME_MIN_LENGTH).max(USERNAME_MAX_LENGTH),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export type CredentialsFormValues = z.infer<typeof credentialsFormSchema>;

export function buildSignInPayload(values: CredentialsFormValues): CredentialsFormValues {
  return { username: values.username.trim().toLowerCase(), password: values.password };
}
