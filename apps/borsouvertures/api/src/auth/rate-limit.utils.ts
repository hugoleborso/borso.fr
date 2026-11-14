import { createHash } from 'node:crypto';

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const SIGN_IN_WINDOW_MINUTES = 15;

export const SIGN_IN_MAX_ATTEMPTS = 5;
export const SIGN_IN_WINDOW_MS =
  SIGN_IN_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

// @FollowsBlueprint utils-pure-module
export function hashClientAddress(clientAddress: string): string {
  return createHash('sha256').update(clientAddress).digest('hex');
}

export function selectWindowFloor(now: Date): Date {
  return new Date(now.getTime() - SIGN_IN_WINDOW_MS);
}

export function isRateLimited(attemptCount: number): boolean {
  return attemptCount > SIGN_IN_MAX_ATTEMPTS;
}
