import { createHmac, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  buildCookie,
  verifyCookie,
} from './session-cookie.utils';

const HMAC_KEY = randomBytes(32);
const NOW = 1_700_000_000_000;

describe('session-cookie.utils', () => {
  it('exposes the cookie name expected by the front-end', () => {
    expect(SESSION_COOKIE_NAME).toBe('pragma_session');
  });

  it('round-trips a freshly built cookie', () => {
    const cookie = buildCookie(HMAC_KEY, NOW);
    const result = verifyCookie(cookie, HMAC_KEY, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.issuedAt).toBe(NOW);
      expect(result.payload.expiresAt).toBe(NOW + SESSION_TTL_MS);
    }
  });

  it('rejects a cookie missing the separator', () => {
    const result = verifyCookie('not-signed', HMAC_KEY, NOW);
    expect(result).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a cookie with an empty payload', () => {
    const result = verifyCookie('.signature', HMAC_KEY, NOW);
    expect(result).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a cookie with an empty signature', () => {
    const result = verifyCookie('payload.', HMAC_KEY, NOW);
    expect(result).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a cookie signed with a different key', () => {
    const cookie = buildCookie(HMAC_KEY, NOW);
    const otherKey = randomBytes(32);
    const result = verifyCookie(cookie, otherKey, NOW);
    expect(result).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('rejects a cookie with a tampered payload', () => {
    const cookie = buildCookie(HMAC_KEY, NOW);
    const [, signature] = cookie.split('.');
    const tampered = `${Buffer.from('{"issuedAt":0,"expiresAt":99999999999999}', 'utf8').toString('base64url')}.${signature ?? ''}`;
    const result = verifyCookie(tampered, HMAC_KEY, NOW);
    expect(result).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('rejects an expired cookie', () => {
    const cookie = buildCookie(HMAC_KEY, NOW);
    const result = verifyCookie(cookie, HMAC_KEY, NOW + SESSION_TTL_MS);
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  function signPayload(payloadEncoded: string): string {
    return createHmac('sha256', HMAC_KEY).update(payloadEncoded).digest('base64url');
  }

  it('rejects a cookie whose payload is not valid JSON', () => {
    const payloadEncoded = Buffer.from('not-json-at-all', 'utf8').toString('base64url');
    const cookie = `${payloadEncoded}.${signPayload(payloadEncoded)}`;
    const result = verifyCookie(cookie, HMAC_KEY, NOW);
    expect(result).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a cookie whose JSON payload lacks the required fields', () => {
    const payloadEncoded = Buffer.from('{"foo":1}', 'utf8').toString('base64url');
    const cookie = `${payloadEncoded}.${signPayload(payloadEncoded)}`;
    const result = verifyCookie(cookie, HMAC_KEY, NOW);
    expect(result).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a cookie whose JSON payload is the JSON scalar `null`', () => {
    const payloadEncoded = Buffer.from('null', 'utf8').toString('base64url');
    const cookie = `${payloadEncoded}.${signPayload(payloadEncoded)}`;
    const result = verifyCookie(cookie, HMAC_KEY, NOW);
    expect(result).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a cookie whose JSON payload carries non-numeric fields', () => {
    const payloadEncoded = Buffer.from('{"issuedAt":"x","expiresAt":"y"}', 'utf8').toString(
      'base64url',
    );
    const cookie = `${payloadEncoded}.${signPayload(payloadEncoded)}`;
    const result = verifyCookie(cookie, HMAC_KEY, NOW);
    expect(result).toEqual({ ok: false, reason: 'malformed' });
  });
});
