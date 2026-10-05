import type { ParseKeys } from 'i18next';

export type AuthStep = 'register' | 'sign-in';

// @FollowsBlueprint core-view-intent
export function selectAuthStep(isRegistered: boolean): AuthStep {
  return isRegistered ? 'sign-in' : 'register';
}

const BAD_REQUEST_STATUS = 400;
const UNAUTHORISED_STATUS = 401;
const FORBIDDEN_STATUS = 403;

const ERROR_KEY_BY_STATUS: Readonly<Record<number, ParseKeys>> = {
  [BAD_REQUEST_STATUS]: 'auth.error.refused',
  [UNAUTHORISED_STATUS]: 'auth.error.refused',
  [FORBIDDEN_STATUS]: 'auth.error.code',
};

export function selectAuthErrorKey(status: number | null): ParseKeys {
  if (status === null) return 'auth.error.cancelled';
  return ERROR_KEY_BY_STATUS[status] ?? 'auth.error.generic';
}

export function canSubmitBootstrapCode(code: string): boolean {
  return code.trim().length > 0;
}
