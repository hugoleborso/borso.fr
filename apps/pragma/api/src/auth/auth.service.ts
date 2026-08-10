/**
 * Service layer for the auth bounded context. Wraps the argon2id
 * hashing + the HMAC key generation around the repository, so the
 * controller carries only request/response shape and never imports
 * crypto or the DB client directly.
 *
 * Argon2id is provided by `hash-wasm` (pure WASM, no native bindings)
 * to keep the Lambda bundle ESM-clean — see
 * `docs/knowledge/lambda-esm-native-modules.md` for the trap that
 * pushed us off the native `argon2` package.
 */

import { randomBytes } from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';
import {
  type AppConfig,
  insertInitialAppConfig,
  loadAppConfig,
  updateAppConfig,
} from './auth.repository';

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

export async function isPasswordValid(config: AppConfig, password: string): Promise<boolean> {
  return await argon2Verify({ password, hash: config.passwordHash });
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
