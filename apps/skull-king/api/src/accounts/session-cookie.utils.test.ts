import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildSessionCookie,
  readSessionAccountId,
  SESSION_TTL_SECONDS,
} from './session-cookie.utils';

const KEY = Buffer.alloc(32, 7);
const OTHER_KEY = Buffer.alloc(32, 8);
const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const NOW = 1_800_000_000_000;
const TTL_MILLISECONDS = SESSION_TTL_SECONDS * 1_000;

const signedCookie = (payloadEncoded: string) =>
  `${payloadEncoded}.${createHmac('sha256', KEY).update(payloadEncoded).digest('base64url')}`;

// @FollowsBlueprint test-pure-unit
describe('the session cookie', () => {
  it('reads back the account it was signed for', () => {
    expect(readSessionAccountId(buildSessionCookie(KEY, NOW, ACCOUNT_ID), KEY, NOW)).toBe(
      ACCOUNT_ID,
    );
  });

  it('lasts thirty days', () => {
    const cookie = buildSessionCookie(KEY, NOW, ACCOUNT_ID);
    expect(SESSION_TTL_SECONDS).toBe(30 * 86_400);
    expect(readSessionAccountId(cookie, KEY, NOW + TTL_MILLISECONDS - 1)).toBe(ACCOUNT_ID);
    expect(readSessionAccountId(cookie, KEY, NOW + TTL_MILLISECONDS)).toBeNull();
  });

  it('refuses a cookie signed with another key', () => {
    expect(
      readSessionAccountId(buildSessionCookie(OTHER_KEY, NOW, ACCOUNT_ID), KEY, NOW),
    ).toBeNull();
  });

  it('refuses a malformed cookie', () => {
    expect(readSessionAccountId('no-separator', KEY, NOW)).toBeNull();
    expect(readSessionAccountId('a.b.c', KEY, NOW)).toBeNull();
    expect(readSessionAccountId('a.', KEY, NOW)).toBeNull();
  });

  it('refuses a well signed cookie with anything after its signature', () => {
    const cookie = buildSessionCookie(KEY, NOW, ACCOUNT_ID);
    expect(readSessionAccountId(`${cookie}.`, KEY, NOW)).toBeNull();
    expect(readSessionAccountId(`${cookie}.!`, KEY, NOW)).toBeNull();
  });

  it('refuses a signed payload that is not a session', () => {
    const notJson = Buffer.from('nope').toString('base64url');
    const notSession = Buffer.from(JSON.stringify({ accountId: 'x' })).toString('base64url');
    expect(readSessionAccountId(signedCookie(notJson), KEY, NOW)).toBeNull();
    expect(readSessionAccountId(signedCookie(notSession), KEY, NOW)).toBeNull();
  });
});
