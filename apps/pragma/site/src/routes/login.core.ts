/** @Feature auth */

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

// @FollowsBlueprint core-label-key
export function selectLoginErrorMessageKey(status: number | null): ParseKeys {
  return LOGIN_ERROR_KEY_BY_STATUS.get(status) ?? UNKNOWN_LOGIN_ERROR_KEY;
}

const RECOVERY_ERROR_KEY_BY_CODE: ReadonlyMap<string, ParseKeys> = new Map([
  ['invalid-recovery', 'auth.invalidRecovery'],
  ['rate-limited', 'auth.recoveryRateLimited'],
  ['auth-not-bootstrapped', 'auth.notBootstrapped'],
]);

const errorBodySchema = z.object({ error: z.string() });

export function selectRecoverErrorMessageKey(status: number | null, body: unknown): ParseKeys {
  const namedError = errorBodySchema.safeParse(body);
  if (namedError.success) {
    const byCode = RECOVERY_ERROR_KEY_BY_CODE.get(namedError.data.error);
    if (byCode !== undefined) return byCode;
  }
  if (status === WRONG_PASSWORD_STATUS) return 'auth.invalidRecovery';
  if (status === TOO_MANY_ATTEMPTS_STATUS) return 'auth.recoveryRateLimited';
  return selectLoginErrorMessageKey(status);
}

const locationStateSchema = z.object({ from: z.string().min(1) }).partial();

export function selectPostLoginPath(locationState: unknown): string {
  const checkedState = locationStateSchema.safeParse(locationState);
  if (!checkedState.success) return DEFAULT_POST_LOGIN_PATH;
  return checkedState.data.from ?? DEFAULT_POST_LOGIN_PATH;
}
