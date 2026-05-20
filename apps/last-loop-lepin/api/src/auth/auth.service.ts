import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Database } from '../database/client';
import {
  type AdminSession,
  createSession,
  deleteSession,
  findAdminPinHash,
  findBucket,
  findValidSession,
  purgeExpiredSessions,
  upsertBucket,
  type RateLimitBucket,
} from './auth.repository';

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_PARTS_COUNT = 3;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SESSION_ID_BYTES = 32;

export class AuthDeniedError extends Error {
  override readonly name = 'AuthDeniedError';
  constructor(public readonly reason: 'rate-limited' | 'invalid-pin' | 'misconfigured') {
    super(`auth denied: ${reason}`);
  }
}

function verifyPinAgainstHash(pin: string, hashedPin: string): boolean {
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

async function consumeRateLimit(
  database: Database,
  ipAddress: string,
  now: Date,
): Promise<void> {
  const existing = await findBucket(database, ipAddress);
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
  await upsertBucket(database, next);
}

async function resetRateLimit(database: Database, ipAddress: string, now: Date): Promise<void> {
  await upsertBucket(database, { ipAddress, count: 0, windowStartedAt: now });
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
export async function login(database: Database, input: LoginInput, now: Date): Promise<LoginResult> {
  const pinHash = await findAdminPinHash(database);
  if (pinHash === null) {
    throw new AuthDeniedError('misconfigured');
  }
  await consumeRateLimit(database, input.ipAddress, now);
  if (!verifyPinAgainstHash(input.pin, pinHash)) {
    throw new AuthDeniedError('invalid-pin');
  }
  await resetRateLimit(database, input.ipAddress, now);
  await purgeExpiredSessions(database, now);
  const sessionId = randomBytes(SESSION_ID_BYTES).toString('hex');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await createSession(database, { id: sessionId, expiresAt });
  return { sessionId, expiresAt };
}

/**
 * Returns the session row when the cookie still maps to a live,
 * unexpired session; `null` otherwise. The middleware uses the `null`
 * result to issue 401 + clear the cookie.
 */
export async function verifySession(
  database: Database,
  sessionId: string,
  now: Date,
): Promise<AdminSession | null> {
  return findValidSession(database, sessionId, now);
}

export async function logout(database: Database, sessionId: string): Promise<void> {
  await deleteSession(database, sessionId);
}
