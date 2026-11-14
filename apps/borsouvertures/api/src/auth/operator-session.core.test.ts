import { describe, expect, it } from 'vitest';
import {
  buildOperatorSessionPayload,
  decideSignIn,
  judgeOperatorSession,
  OPERATOR_CREDENTIAL_ID,
  parseOperatorSessionPayload,
  selectCredentialToVerify,
} from './operator-session.core';

const NOW_MILLIS = 1_800_000_000_000;
const TTL_MILLIS = 60_000;
const CREDENTIAL = { id: OPERATOR_CREDENTIAL_ID, sessionEpoch: 3 };
const SIGNING_KEY = 'c2lnbmluZy1rZXk=';

function buildPayload() {
  return buildOperatorSessionPayload(CREDENTIAL, NOW_MILLIS, TTL_MILLIS);
}

// @FollowsBlueprint test-pure-unit
describe('buildOperatorSessionPayload', () => {
  it('names the credential and its epoch and expires one time to live after now', () => {
    expect(buildPayload()).toEqual({
      credentialId: OPERATOR_CREDENTIAL_ID,
      epoch: 3,
      issuedAt: NOW_MILLIS,
      expiresAt: NOW_MILLIS + TTL_MILLIS,
    });
  });
});

describe('parseOperatorSessionPayload', () => {
  it('reads back a payload it wrote', () => {
    expect(parseOperatorSessionPayload(JSON.stringify(buildPayload()))).toEqual(buildPayload());
  });

  it('answers null for text that is not JSON', () => {
    expect(parseOperatorSessionPayload('{credentialId')).toBeNull();
  });

  it('answers null for a payload whose epoch is negative', () => {
    expect(
      parseOperatorSessionPayload(JSON.stringify({ ...buildPayload(), epoch: -1 })),
    ).toBeNull();
  });

  it('answers null for a payload whose credential is not a UUID', () => {
    expect(
      parseOperatorSessionPayload(JSON.stringify({ ...buildPayload(), credentialId: 'operator' })),
    ).toBeNull();
  });
});

describe('judgeOperatorSession', () => {
  it('accepts a session of the stored credential at its epoch before it expires', () => {
    expect(judgeOperatorSession(buildPayload(), CREDENTIAL, NOW_MILLIS + TTL_MILLIS - 1)).toBe(
      'valid',
    );
  });

  it('expires the session at the exact instant it ends', () => {
    expect(judgeOperatorSession(buildPayload(), CREDENTIAL, NOW_MILLIS + TTL_MILLIS)).toBe(
      'expired',
    );
  });

  it('refuses a session when no credential is stored', () => {
    expect(judgeOperatorSession(buildPayload(), null, NOW_MILLIS)).toBe('unknown-credential');
  });

  it('refuses a session issued for another credential', () => {
    const other = { id: '0b5e0000-0000-4000-8000-000000000002', sessionEpoch: 3 };
    expect(judgeOperatorSession(buildPayload(), other, NOW_MILLIS)).toBe('unknown-credential');
  });

  it('refuses a session issued before the script rotated the epoch', () => {
    expect(
      judgeOperatorSession(buildPayload(), { ...CREDENTIAL, sessionEpoch: 4 }, NOW_MILLIS),
    ).toBe('stale-epoch');
  });
});

describe('selectCredentialToVerify', () => {
  it('skips the password hash once the address is rate limited', () => {
    expect(selectCredentialToVerify(true, CREDENTIAL)).toBeNull();
  });

  it('verifies the stored credential otherwise', () => {
    expect(selectCredentialToVerify(false, CREDENTIAL)).toBe(CREDENTIAL);
  });
});

describe('decideSignIn', () => {
  const facts = {
    isRateLimited: false,
    credential: CREDENTIAL,
    signingKey: SIGNING_KEY,
    isPasswordRight: true,
  };

  it('signs in with the stored credential and signing key', () => {
    expect(decideSignIn(facts)).toEqual({
      kind: 'signed-in',
      credential: CREDENTIAL,
      signingKey: SIGNING_KEY,
    });
  });

  it('answers 429 before anything else once the address is rate limited', () => {
    expect(decideSignIn({ ...facts, isRateLimited: true, credential: null })).toEqual({
      kind: 'refused',
      refusal: 'rate-limited',
      status: 429,
    });
  });

  it('answers 503 when the script has not written the credential', () => {
    expect(decideSignIn({ ...facts, credential: null })).toEqual({
      kind: 'refused',
      refusal: 'auth-not-bootstrapped',
      status: 503,
    });
  });

  it('answers 503 when the script has not written the signing key', () => {
    expect(decideSignIn({ ...facts, signingKey: null })).toEqual({
      kind: 'refused',
      refusal: 'auth-not-bootstrapped',
      status: 503,
    });
  });

  it('answers 401 for a wrong password', () => {
    expect(decideSignIn({ ...facts, isPasswordRight: false })).toEqual({
      kind: 'refused',
      refusal: 'invalid-credentials',
      status: 401,
    });
  });
});
