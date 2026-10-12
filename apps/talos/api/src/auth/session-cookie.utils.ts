import { createHmac, timingSafeEqual } from 'node:crypto';
import { buildSessionPayload, parseSessionPayload, type SessionPayload } from './session.core';

export const SESSION_COOKIE_NAME = 'talos_session';

const COOKIE_SEPARATOR = '.';

export type CookieVerdict =
  | { readonly ok: true; readonly payload: SessionPayload }
  | { readonly ok: false; readonly reason: 'malformed' | 'bad-signature' | 'expired' };

function sign(encodedPayload: string, hmacKey: string): Buffer {
  return createHmac('sha256', hmacKey).update(encodedPayload).digest();
}

export function buildSessionCookie(hmacKey: string, nowMillis: number, sessionId: string): string {
  const sessionPayload = buildSessionPayload(sessionId, nowMillis);
  const encodedPayload = Buffer.from(JSON.stringify(sessionPayload)).toString('base64url');
  return `${encodedPayload}${COOKIE_SEPARATOR}${sign(encodedPayload, hmacKey).toString('base64url')}`;
}

function isSignatureValid(encodedPayload: string, encodedSignature: string, hmacKey: string) {
  const expected = sign(encodedPayload, hmacKey);
  const provided = Buffer.from(encodedSignature, 'base64url');
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

// @FollowsBlueprint utils-pure-module
export function verifySessionCookie(
  cookieValue: string,
  hmacKey: string,
  nowMillis: number,
): CookieVerdict {
  const separatorIndex = cookieValue.indexOf(COOKIE_SEPARATOR);
  if (separatorIndex === -1) return { ok: false, reason: 'malformed' };
  const encodedPayload = cookieValue.slice(0, separatorIndex);
  const encodedSignature = cookieValue.slice(separatorIndex + 1);
  if (encodedPayload === '' || encodedSignature === '') return { ok: false, reason: 'malformed' };
  if (!isSignatureValid(encodedPayload, encodedSignature, hmacKey)) {
    return { ok: false, reason: 'bad-signature' };
  }
  const sessionPayload = parseSessionPayload(
    Buffer.from(encodedPayload, 'base64url').toString('utf8'),
  );
  if (sessionPayload === null) return { ok: false, reason: 'malformed' };
  if (nowMillis >= sessionPayload.expiresAt) return { ok: false, reason: 'expired' };
  return { ok: true, payload: sessionPayload };
}
