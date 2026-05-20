/**
 * Service layer for the auth bounded context. Wraps the argon2id
 * hashing + the HMAC key generation around the repository, so the
 * controller carries only request/response shape and never imports
 * crypto or the DB client directly.
 */

import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import type { Database } from '../database/client';
import {
  type AppConfig,
  insertInitialAppConfig,
  loadAppConfig,
  updateAppConfig,
} from './auth.repository';

const HMAC_KEY_BYTES = 32;

export async function getAppConfig(database: Database): Promise<AppConfig | null> {
  return await loadAppConfig(database);
}

export async function verifyPassword(
  config: AppConfig,
  password: string,
): Promise<boolean> {
  return await argon2.verify(config.passwordHash, password);
}

export type BootstrapResult = { kind: 'ok' } | { kind: 'already-bootstrapped' };

export async function bootstrapAuth(
  database: Database,
  password: string,
  now: Date,
): Promise<BootstrapResult> {
  const existing = await loadAppConfig(database);
  if (existing !== null) return { kind: 'already-bootstrapped' };
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const hmacKey = randomBytes(HMAC_KEY_BYTES);
  await insertInitialAppConfig(database, hash, hmacKey, now);
  return { kind: 'ok' };
}

export type RotateResult = { kind: 'ok' } | { kind: 'not-bootstrapped' };

export async function rotatePassword(
  database: Database,
  password: string,
  now: Date,
): Promise<RotateResult> {
  const existing = await loadAppConfig(database);
  if (existing === null) return { kind: 'not-bootstrapped' };
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const hmacKey = randomBytes(HMAC_KEY_BYTES);
  await updateAppConfig(database, hash, hmacKey, now);
  return { kind: 'ok' };
}
