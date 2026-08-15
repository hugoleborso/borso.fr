/**
 * What the sign-in screen does with the two answers it can get: where it sends
 * the visitor once the password is accepted, and which message it shows when
 * it is not.
 */

import type { ParseKeys } from 'i18next';
import { z } from 'zod';

export const DEFAULT_POST_LOGIN_PATH = '/catalog';

const TOO_MANY_ATTEMPTS_STATUS = 429;
const WRONG_PASSWORD_STATUS = 401;
const NOT_BOOTSTRAPPED_STATUS = 503;

export const UNKNOWN_LOGIN_ERROR_KEY: ParseKeys = 'auth.unknownError';

const LOGIN_ERROR_KEY_BY_STATUS: ReadonlyMap<number | null, ParseKeys> = new Map([
  [TOO_MANY_ATTEMPTS_STATUS, 'auth.rateLimited'],
  [WRONG_PASSWORD_STATUS, 'auth.invalidPassword'],
  [NOT_BOOTSTRAPPED_STATUS, 'auth.notBootstrapped'],
]);

/**
 * `null` stands for a failure the API did not answer at all, e.g. the network
 * dropped, which reads the same way to the visitor as a status nobody planned
 * for.
 */
// @FollowsBlueprint core-label-key
export function selectLoginErrorMessageKey(status: number | null): ParseKeys {
  return LOGIN_ERROR_KEY_BY_STATUS.get(status) ?? UNKNOWN_LOGIN_ERROR_KEY;
}

const locationStateSchema = z.object({ from: z.string().min(1) }).partial();

export function selectPostLoginPath(locationState: unknown): string {
  const checkedState = locationStateSchema.safeParse(locationState);
  if (!checkedState.success) return DEFAULT_POST_LOGIN_PATH;
  return checkedState.data.from ?? DEFAULT_POST_LOGIN_PATH;
}
