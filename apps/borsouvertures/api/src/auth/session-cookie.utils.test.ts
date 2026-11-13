import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { OPERATOR_CREDENTIAL_ID } from './operator-session.core';
import {
  buildSessionCookie,
  judgeSessionCookie,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_TTL_MS,
} from './session-cookie.utils';

const NOW_MILLIS = 1_800_000_000_000;
const SIGNING_KEY = Buffer.from('a fixture signing key').toString('base64');
const OTHER_SIGNING_KEY = Buffer.from('another signing key').toString('base64');
const CREDENTIAL = { id: OPERATOR_CREDENTIAL_ID, sessionEpoch: 1 };

function judge(cookieValue: string | undefined, nowMillis = NOW_MILLIS) {
  return judgeSessionCookie({
    cookieValue,
    signingKey: SIGNING_KEY,
    credential: CREDENTIAL,
    nowMillis,
  });
}

function encodeBase64Url(text: string): string {
  return Buffer.from(text).toString('base64url');
}

// @FollowsBlueprint test-pure-unit
describe('session cookie lifetime', () => {
  it('lasts thirty days, and the cookie max age says the same in seconds', () => {
    expect(SESSION_TTL_MS).toBe(2_592_000_000);
    expect(SESSION_COOKIE_MAX_AGE_SECONDS).toBe(2_592_000);
  });
});

describe('judgeSessionCookie', () => {
  const cookie = buildSessionCookie(SIGNING_KEY, CREDENTIAL, NOW_MILLIS);

  it('accepts the cookie it built until the session expires', () => {
    expect(judge(cookie)).toBe('valid');
    expect(judge(cookie, NOW_MILLIS + SESSION_TTL_MS)).toBe('expired');
  });

  it('answers auth-not-bootstrapped before reading a cookie when no signing key is stored', () => {
    expect(
      judgeSessionCookie({
        cookieValue: cookie,
        signingKey: null,
        credential: CREDENTIAL,
        nowMillis: NOW_MILLIS,
      }),
    ).toBe('auth-not-bootstrapped');
  });

  it('answers missing when the request carries no cookie', () => {
    expect(judge(undefined)).toBe('missing');
  });

  it('answers malformed for a value with no separator', () => {
    expect(judge('no-separator')).toBe('malformed');
  });

  it('refuses a cookie signed with another key', () => {
    expect(judge(buildSessionCookie(OTHER_SIGNING_KEY, CREDENTIAL, NOW_MILLIS))).toBe(
      'bad-signature',
    );
  });

  it('refuses a payload edited after signing', () => {
    const [, signature] = cookie.split('.');
    const forged = encodeBase64Url(
      JSON.stringify({
        credentialId: OPERATOR_CREDENTIAL_ID,
        epoch: 1,
        issuedAt: NOW_MILLIS,
        expiresAt: NOW_MILLIS * 2,
      }),
    );
    expect(judge(`${forged}.${String(signature)}`)).toBe('bad-signature');
  });

  it('refuses a signature of another length without comparing it', () => {
    const [payload] = cookie.split('.');
    expect(judge(`${String(payload)}.${encodeBase64Url('short')}`)).toBe('bad-signature');
  });

  it('answers malformed for a signed payload that is not a session', () => {
    const unreadableSession = encodeBase64Url('{"credentialId":"operator"}');
    const signature = createHmac('sha256', Buffer.from(SIGNING_KEY, 'base64'))
      .update(unreadableSession)
      .digest('base64url');
    expect(judge(`${unreadableSession}.${signature}`)).toBe('malformed');
  });

  it('keeps everything after the first separator as the signature', () => {
    expect(judge(`${cookie}.extra`)).toBe('bad-signature');
  });

  it('judges the session once the signature holds, so a rotated epoch ends it', () => {
    expect(
      judgeSessionCookie({
        cookieValue: cookie,
        signingKey: SIGNING_KEY,
        credential: { ...CREDENTIAL, sessionEpoch: 2 },
        nowMillis: NOW_MILLIS,
      }),
    ).toBe('stale-epoch');
  });
});
