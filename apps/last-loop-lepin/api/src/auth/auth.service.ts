import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { AuthDenialReason } from './auth.core';
import {
  type AdminSession,
  createSession,
  deleteSession,
  findAdminPinHash,
  findBucket,
  findValidSession,
  purgeExpiredSessions,
  type RateLimitBucket,
  upsertBucket,
} from './auth.repository';

// @FollowsBlueprint service-facade-reexport
export { httpStatusForAuthDenial, readClientIp } from './auth.core';

const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const MILLISECONDS_PER_HOUR = MINUTES_PER_HOUR * MILLISECONDS_PER_MINUTE;
const RATE_LIMIT_WINDOW_MINUTES = 5;
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_MINUTES * MILLISECONDS_PER_MINUTE;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_PARTS_COUNT = 3;
const SESSION_TTL_HOURS = 12;
const SESSION_TTL_MS = SESSION_TTL_HOURS * MILLISECONDS_PER_HOUR;
const SESSION_ID_BYTES = 32;

// @FollowsBlueprint named-domain-error
export class AuthDeniedError extends Error {
  override readonly name = 'AuthDeniedError';
  constructor(public readonly reason: AuthDenialReason) {
    super(`auth denied: ${reason}`);
  }
}

function isPinMatchingHash(pin: string, hashedPin: string): boolean {
  const parts = hashedPin.split('$');
  if (parts.length !== SCRYPT_PARTS_COUNT || parts[0] !== 'scrypt') return false;
  const saltHex = parts[1];
  const expectedKeyHex = parts[2];
  if (saltHex === undefined || expectedKeyHex === undefined) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expectedKey = Buffer.from(expectedKeyHex, 'hex');
  const candidateKey = scryptSync(pin, salt, SCRYPT_KEY_LENGTH);
  if (candidateKey.length !== expectedKey.length) return false;
  return timingSafeEqual(candidateKey, expectedKey);
}

async function consumeRateLimit(ipAddress: string, now: Date): Promise<void> {
  const existing = await findBucket(ipAddress);
  const windowStartedAt =
    existing !== null && now.getTime() - existing.windowStartedAt.getTime() < RATE_LIMIT_WINDOW_MS
      ? existing.windowStartedAt
      : now;
  const previousCount =
    existing !== null && windowStartedAt === existing.windowStartedAt ? existing.count : 0;
  if (previousCount >= RATE_LIMIT_MAX_ATTEMPTS) {
    throw new AuthDeniedError('rate-limited');
  }
  const next: RateLimitBucket = {
    ipAddress,
    count: previousCount + 1,
    windowStartedAt,
  };
  await upsertBucket(next);
}

async function resetRateLimit(ipAddress: string, now: Date): Promise<void> {
  await upsertBucket({ ipAddress, count: 0, windowStartedAt: now });
}

export interface LoginInput {
  readonly pin: string;
  readonly ipAddress: string;
}

export interface LoginResult {
  readonly sessionId: string;
  readonly expiresAt: Date;
}

/**
 * Verifies the PIN against the DB-stored scrypt hash and, on success,
 * issues a new session row. The session id is a 32-byte random hex
 * string carried by the `lastloop_admin` cookie. Replaces the previous
 * stateless JWT flow — server-side logout becomes a single DELETE.
 *
 * Throws `AuthDeniedError('misconfigured')` if the operator hasn't seeded
 * the `admin_credentials` row yet.
 */
// @FollowsBlueprint service-orchestration
export async function login(input: LoginInput, now: Date): Promise<LoginResult> {
  const pinHash = await findAdminPinHash();
  if (pinHash === null) {
    throw new AuthDeniedError('misconfigured');
  }
  await consumeRateLimit(input.ipAddress, now);
  if (!isPinMatchingHash(input.pin, pinHash)) {
    throw new AuthDeniedError('invalid-pin');
  }
  await resetRateLimit(input.ipAddress, now);
  await purgeExpiredSessions(now);
  const sessionId = randomBytes(SESSION_ID_BYTES).toString('hex');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await createSession({ id: sessionId, expiresAt });
  return { sessionId, expiresAt };
}

/**
 * Returns the session row when the cookie still maps to a live,
 * unexpired session; `null` otherwise. The middleware uses the `null`
 * result to issue 401 + clear the cookie.
 */
export async function verifySession(sessionId: string, now: Date): Promise<AdminSession | null> {
  return findValidSession(sessionId, now);
}

export async function logout(sessionId: string): Promise<void> {
  await deleteSession(sessionId);
}
