import { randomBytes } from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';
import {
  type AppConfig,
  insertInitialAppConfig,
  loadAppConfig,
  updateAppConfig,
} from './auth.repository';
import { hashIp, readClientIp } from './ip-hash.utils';
import { type BucketStore, isRateLimited, recordAttempt } from './rate-limit.utils';
import { buildCookie, SESSION_TTL_MS } from './session-cookie.utils';

const HMAC_KEY_BYTES = 32;
const ARGON2_SALT_BYTES = 16;
const ARGON2_HASH_LENGTH = 32;
const ARGON2_MEMORY_KIB = 65536;
const ARGON2_ITERATIONS = 3;
const ARGON2_PARALLELISM = 4;

async function hashSharedPassword(password: string): Promise<string> {
  return await argon2id({
    password,
    salt: randomBytes(ARGON2_SALT_BYTES),
    iterations: ARGON2_ITERATIONS,
    parallelism: ARGON2_PARALLELISM,
    memorySize: ARGON2_MEMORY_KIB,
    hashLength: ARGON2_HASH_LENGTH,
    outputType: 'encoded',
  });
}

export async function getAppConfig(): Promise<AppConfig | null> {
  return await loadAppConfig();
}

export type LoginAttempt =
  | { kind: 'ok'; cookieValue: string; expiresAt: string }
  | { kind: 'rate-limited' }
  | { kind: 'not-bootstrapped' }
  | { kind: 'invalid-password' };

export interface AttemptLoginParams {
  readonly password: string;
  readonly forwardedForHeader: string | undefined;
  readonly bucketStore: BucketStore;
  readonly now: Date;
}

export async function attemptLogin(params: AttemptLoginParams): Promise<LoginAttempt> {
  const ipHash = hashIp(readClientIp(params.forwardedForHeader));
  const nowMillis = params.now.getTime();
  const bucket = recordAttempt(params.bucketStore.read(ipHash), nowMillis);
  params.bucketStore.write(ipHash, bucket);
  if (isRateLimited(bucket)) return { kind: 'rate-limited' };
  const config = await loadAppConfig();
  if (config === null) return { kind: 'not-bootstrapped' };
  const isPasswordOk = await argon2Verify({
    password: params.password,
    hash: config.passwordHash,
  });
  if (!isPasswordOk) return { kind: 'invalid-password' };
  params.bucketStore.clear(ipHash);
  return {
    kind: 'ok',
    cookieValue: buildCookie(config.hmacKey, nowMillis),
    expiresAt: new Date(nowMillis + SESSION_TTL_MS).toISOString(),
  };
}

export type BootstrapResult = { kind: 'ok' } | { kind: 'already-bootstrapped' };

export async function bootstrapAuth(password: string, now: Date): Promise<BootstrapResult> {
  const existing = await loadAppConfig();
  if (existing !== null) return { kind: 'already-bootstrapped' };
  const hash = await hashSharedPassword(password);
  const hmacKey = randomBytes(HMAC_KEY_BYTES);
  await insertInitialAppConfig(hash, hmacKey, now);
  return { kind: 'ok' };
}

export type RotateResult = { kind: 'ok' } | { kind: 'not-bootstrapped' };

export async function rotatePassword(password: string, now: Date): Promise<RotateResult> {
  const existing = await loadAppConfig();
  if (existing === null) return { kind: 'not-bootstrapped' };
  const hash = await hashSharedPassword(password);
  const hmacKey = randomBytes(HMAC_KEY_BYTES);
  await updateAppConfig(hash, hmacKey, now);
  return { kind: 'ok' };
}
