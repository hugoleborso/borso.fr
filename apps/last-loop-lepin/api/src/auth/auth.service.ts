import { scryptSync, timingSafeEqual } from 'node:crypto';
import type { Database } from '../database/client';
import { signAdminSession } from './auth.jwt';
import { findBucket, upsertBucket, type RateLimitBucket } from './auth.repository';

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_PARTS_COUNT = 3;

export class AuthDeniedError extends Error {
  override readonly name = 'AuthDeniedError';
  constructor(public readonly reason: 'rate-limited' | 'invalid-pin' | 'misconfigured') {
    super(`auth denied: ${reason}`);
  }
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.length === 0 ? undefined : value;
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
  readonly token: string;
  readonly expiresAt: Date;
}

export async function login(database: Database, input: LoginInput, now: Date): Promise<LoginResult> {
  const pinHash = readEnv('PIN_HASH');
  const jwtSecret = readEnv('JWT_SECRET');
  if (pinHash === undefined || jwtSecret === undefined) {
    throw new AuthDeniedError('misconfigured');
  }
  await consumeRateLimit(database, input.ipAddress, now);
  if (!verifyPinAgainstHash(input.pin, pinHash)) {
    throw new AuthDeniedError('invalid-pin');
  }
  await resetRateLimit(database, input.ipAddress, now);
  const token = await signAdminSession(jwtSecret, now);
  const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  return { token, expiresAt };
}

export const AUTH_CONSTANTS = {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_ATTEMPTS,
} as const;
