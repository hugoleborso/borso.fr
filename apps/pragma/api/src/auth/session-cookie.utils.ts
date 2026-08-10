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
 * Pure module — `crypto` and `zod` are its only dependencies. The
 * caller passes `now` so callers stay testable; `verifyCookie` rejects
 * expired tokens deterministically.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const SESSION_COOKIE_NAME = 'pragma_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const COOKIE_SEPARATOR = '.';

const sessionPayloadSchema = z.object({
  issuedAt: z.number(),
  expiresAt: z.number(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

export type VerifyResult =
  | { ok: true; payload: SessionPayload }
  | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' };

function toBase64Url(bytes: Buffer): string {
  return bytes.toString('base64url');
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
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
  const payloadEncoded = toBase64Url(Buffer.from(JSON.stringify(payload)));
  const signature = sign(payloadEncoded, hmacKey);
  return `${payloadEncoded}${COOKIE_SEPARATOR}${signature}`;
}

function parseJsonPayload(raw: string): SessionPayload | null {
  try {
    return sessionPayloadSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
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
    expectedBytes.length !== providedBytes.length ||
    !timingSafeEqual(expectedBytes, providedBytes)
  ) {
    return { ok: false, reason: 'bad-signature' };
  }
  const payload = parseJsonPayload(fromBase64Url(payloadEncoded).toString('utf8'));
  if (payload === null) return { ok: false, reason: 'malformed' };
  if (nowMillis >= payload.expiresAt) return { ok: false, reason: 'expired' };
  return { ok: true, payload };
}
