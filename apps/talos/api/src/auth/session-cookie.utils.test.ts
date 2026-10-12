import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildSessionCookie,
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from './session-cookie.utils';

const KEY = 'clé-hmac';
const NOW = 1_700_000_000_000;

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('session cookie', () => {
  it('is named as the contract says', () => {
    expect(SESSION_COOKIE_NAME).toBe('talos_session');
  });

  it('verifies a cookie it signed and reads the session back', () => {
    const cookie = buildSessionCookie(KEY, NOW, 'session-1');
    expect(verifySessionCookie(cookie, KEY, NOW + 1)).toEqual({
      ok: true,
      payload: { sessionId: 'session-1', issuedAt: NOW, expiresAt: NOW + 2_592_000_000 },
    });
  });

  it('refuses a cookie signed with another key', () => {
    const cookie = buildSessionCookie('autre-clé', NOW, 'session-1');
    expect(verifySessionCookie(cookie, KEY, NOW)).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('refuses a signature of the right length that does not match', () => {
    const [payload] = buildSessionCookie(KEY, NOW, 'session-1').split('.');
    const forged = `${payload ?? ''}.${Buffer.alloc(32).toString('base64url')}`;
    expect(verifySessionCookie(forged, KEY, NOW)).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('refuses a signature of another length without comparing it', () => {
    const [encodedPayload] = buildSessionCookie(KEY, NOW, 'session-1').split('.');
    expect(verifySessionCookie(`${encodedPayload ?? ''}.abc`, KEY, NOW)).toEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });

  it('refuses a cookie at its expiry', () => {
    const cookie = buildSessionCookie(KEY, NOW, 'session-1');
    expect(verifySessionCookie(cookie, KEY, NOW + 2_592_000_000)).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it.each([['sans-point'], ['.signature'], ['charge.']])(
    'refuses the malformed cookie %s',
    (cookie) => {
      expect(verifySessionCookie(cookie, KEY, NOW)).toEqual({ ok: false, reason: 'malformed' });
    },
  );

  it('refuses a correctly signed cookie whose content is not a session', () => {
    const encodedPayload = encode({ autre: true });
    const signature = createHmac('sha256', KEY).update(encodedPayload).digest('base64url');
    expect(verifySessionCookie(`${encodedPayload}.${signature}`, KEY, NOW)).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });
});
