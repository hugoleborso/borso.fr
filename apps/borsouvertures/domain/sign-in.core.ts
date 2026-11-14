export const SIGN_IN_PASSWORD_MAX_LENGTH = 256;

export const SIGN_IN_REFUSALS = [
  'invalid-credentials',
  'rate-limited',
  'auth-not-bootstrapped',
] as const;

export type SignInRefusal = (typeof SIGN_IN_REFUSALS)[number];

// @FollowsBlueprint domain-shared-selection
export function isSignInPassword(value: string): boolean {
  return value.length > 0 && value.length <= SIGN_IN_PASSWORD_MAX_LENGTH;
}

export function parseSignInRefusal(value: unknown): SignInRefusal | null {
  return SIGN_IN_REFUSALS.find((refusal) => refusal === value) ?? null;
}
