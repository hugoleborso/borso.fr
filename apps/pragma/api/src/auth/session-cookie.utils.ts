/**
 * Signed-cookie format for the pragma shared-password session.
 *
 * Cookie value layout: `<payload>.<signature>` where
 *   - `payload` is `base64url(JSON({ issuedAt, expiresAt }))`
 *   - `signature` is `base64url(HMAC-SHA256(payload, hmacKey))`
 *
 * The HMAC key lives in `pragma.app_config.hmac_key`; rotating it (via
 * `POST /api/admin/rotate-password`) invalidates every existing cookie.
 * See ADR-0004.
 *
 * Pure module — `crypto` is the only side-effect-free dependency. The
 * caller passes `now` so callers stay testable; `verifyCookie` rejects
 * expired tokens deterministically.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE_NAME = 'pragma_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const COOKIE_SEPARATOR = '.';

export interface SessionPayload {
  issuedAt: number;
  expiresAt: number;
}

export type VerifyResult =
  | { ok: true; payload: SessionPayload }
  | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' };

function toBase64Url(bytes: Buffer): string {
  return bytes.toString('base64url');
}

function fromBase64Url(value: string): Buffer | null {
  try {
    return Buffer.from(value, 'base64url');
  } catch {
    return null;
  }
}

function sign(payloadEncoded: string, hmacKey: Buffer): string {
  const mac = createHmac('sha256', hmacKey).update(payloadEncoded).digest();
  return toBase64Url(mac);
}

export function buildCookie(hmacKey: Buffer, nowMillis: number): string {
  const payload: SessionPayload = {
    issuedAt: nowMillis,
    expiresAt: nowMillis + SESSION_TTL_MS,
  };
  const payloadEncoded = toBase64Url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const signature = sign(payloadEncoded, hmacKey);
  return `${payloadEncoded}${COOKIE_SEPARATOR}${signature}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJsonPayload(raw: string): SessionPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const issuedAt = parsed.issuedAt;
  const expiresAt = parsed.expiresAt;
  if (typeof issuedAt !== 'number' || typeof expiresAt !== 'number') {
    return null;
  }
  return { issuedAt, expiresAt };
}

export function verifyCookie(
  cookieValue: string,
  hmacKey: Buffer,
  nowMillis: number,
): VerifyResult {
  const separatorIndex = cookieValue.indexOf(COOKIE_SEPARATOR);
  if (separatorIndex === -1) return { ok: false, reason: 'malformed' };
  const payloadEncoded = cookieValue.slice(0, separatorIndex);
  const signatureEncoded = cookieValue.slice(separatorIndex + 1);
  if (payloadEncoded.length === 0 || signatureEncoded.length === 0) {
    return { ok: false, reason: 'malformed' };
  }
  const expectedSignature = sign(payloadEncoded, hmacKey);
  const expectedBytes = fromBase64Url(expectedSignature);
  const providedBytes = fromBase64Url(signatureEncoded);
  if (
    expectedBytes === null ||
    providedBytes === null ||
    expectedBytes.length !== providedBytes.length ||
    !timingSafeEqual(expectedBytes, providedBytes)
  ) {
    return { ok: false, reason: 'bad-signature' };
  }
  const payloadBytes = fromBase64Url(payloadEncoded);
  if (payloadBytes === null) return { ok: false, reason: 'malformed' };
  const payload = parseJsonPayload(payloadBytes.toString('utf8'));
  if (payload === null) return { ok: false, reason: 'malformed' };
  if (nowMillis >= payload.expiresAt) return { ok: false, reason: 'expired' };
  return { ok: true, payload };
}
