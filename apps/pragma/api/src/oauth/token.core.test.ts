import { describe, expect, it } from 'vitest';
import type { StoredAssistantGrant, StoredAuthorizationCode } from './oauth.types';
import {
  ACCESS_TOKEN_LIFETIME_MS,
  buildTokenResponse,
  hashToken,
  isCodeExchangeAccepted,
  isCodeUsable,
  isVerifierMatchingChallenge,
  judgeGrant,
  judgeRefresh,
  readTokenGrant,
  REFRESH_TOKEN_LIFETIME_MS,
  selectTokenExpiries,
} from './token.core';

const ISSUER = 'https://pragma.borso.fr';
const RFC_7636_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_7636_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const NOW = new Date('2026-10-27T10:00:00.000Z');
const ONE_MILLISECOND = 1;

const STORED_CODE: StoredAuthorizationCode = {
  clientId: 'client-1',
  memberId: '00000000-0000-4000-8000-000000000001',
  redirectUri: 'http://127.0.0.1:47823/callback',
  codeChallenge: RFC_7636_CHALLENGE,
  expiresAt: new Date(NOW.getTime() + ONE_MILLISECOND),
};
const PRESENTED_CODE = {
  clientId: 'client-1',
  redirectUri: 'http://127.0.0.1:47823/callback',
  codeVerifier: RFC_7636_VERIFIER,
};

const GRANT: StoredAssistantGrant = {
  id: 'grant-1',
  clientId: 'client-1',
  memberId: '00000000-0000-4000-8000-000000000001',
  refreshTokenHash: 'current-hash',
  previousRefreshTokenHash: 'previous-hash',
  refreshExpiresAt: new Date(NOW.getTime() + ONE_MILLISECOND),
  sessionEpoch: 2,
};
const CURRENT_CREDENTIAL = { sessionEpoch: 2 };

// @FollowsBlueprint test-pure-unit
describe('hashToken', () => {
  it('answers the hex SHA-256 of the token', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('isVerifierMatchingChallenge', () => {
  it('matches the RFC 7636 appendix B pair', () => {
    expect(isVerifierMatchingChallenge(RFC_7636_VERIFIER, RFC_7636_CHALLENGE)).toBe(true);
  });

  it('refuses another verifier, a challenge of another length, and the plain method', () => {
    expect(isVerifierMatchingChallenge(`${RFC_7636_VERIFIER}x`, RFC_7636_CHALLENGE)).toBe(false);
    expect(isVerifierMatchingChallenge(RFC_7636_VERIFIER, RFC_7636_CHALLENGE.slice(1))).toBe(false);
    expect(isVerifierMatchingChallenge(RFC_7636_VERIFIER, RFC_7636_VERIFIER)).toBe(false);
  });
});

describe('readTokenGrant', () => {
  it('reads an authorization code exchange', () => {
    expect(
      readTokenGrant(
        {
          grant_type: 'authorization_code',
          code: 'the-code',
          client_id: 'client-1',
          redirect_uri: 'http://127.0.0.1:47823/callback',
          code_verifier: RFC_7636_VERIFIER,
          resource: 'https://pragma.borso.fr/mcp',
        },
        ISSUER,
      ),
    ).toEqual({
      kind: 'authorization-code',
      code: 'the-code',
      clientId: 'client-1',
      redirectUri: 'http://127.0.0.1:47823/callback',
      codeVerifier: RFC_7636_VERIFIER,
    });
  });

  it.each(['code', 'client_id', 'redirect_uri', 'code_verifier'])(
    'refuses an authorization code exchange missing %s',
    (field) => {
      const request = {
        grant_type: 'authorization_code',
        code: 'the-code',
        client_id: 'client-1',
        redirect_uri: 'http://127.0.0.1:47823/callback',
        code_verifier: RFC_7636_VERIFIER,
        [field]: undefined,
      };

      expect(readTokenGrant(request, ISSUER)).toEqual({
        kind: 'refused',
        error: 'invalid_request',
      });
    },
  );

  it('reads a refresh, and refuses one missing its token or its client', () => {
    expect(
      readTokenGrant({ grant_type: 'refresh_token', refresh_token: 'r', client_id: 'c' }, ISSUER),
    ).toEqual({ kind: 'refresh-token', refreshToken: 'r', clientId: 'c' });
    expect(readTokenGrant({ grant_type: 'refresh_token', client_id: 'c' }, ISSUER)).toEqual({
      kind: 'refused',
      error: 'invalid_request',
    });
    expect(readTokenGrant({ grant_type: 'refresh_token', refresh_token: 'r' }, ISSUER)).toEqual({
      kind: 'refused',
      error: 'invalid_request',
    });
  });

  it('refuses another grant type and another resource', () => {
    expect(readTokenGrant({ grant_type: 'client_credentials' }, ISSUER)).toEqual({
      kind: 'refused',
      error: 'unsupported_grant_type',
    });
    expect(
      readTokenGrant(
        { grant_type: 'refresh_token', refresh_token: 'r', client_id: 'c', resource: 'x' },
        ISSUER,
      ),
    ).toEqual({ kind: 'refused', error: 'invalid_target' });
  });
});

describe('isCodeUsable', () => {
  it('is usable until the instant it expires', () => {
    expect(isCodeUsable(new Date(NOW.getTime() + ONE_MILLISECOND), NOW)).toBe(true);
    expect(isCodeUsable(NOW, NOW)).toBe(false);
  });
});

describe('isCodeExchangeAccepted', () => {
  it('accepts the client, address and verifier the code was issued for, before it expires', () => {
    expect(isCodeExchangeAccepted(STORED_CODE, PRESENTED_CODE, NOW)).toBe(true);
  });

  it.each([
    ['an expired code', { ...STORED_CODE, expiresAt: NOW }, PRESENTED_CODE],
    ['another client', STORED_CODE, { ...PRESENTED_CODE, clientId: 'client-2' }],
    [
      'another redirect address',
      STORED_CODE,
      { ...PRESENTED_CODE, redirectUri: 'http://127.0.0.1:1/callback' },
    ],
    ['a wrong verifier', STORED_CODE, { ...PRESENTED_CODE, codeVerifier: 'x'.repeat(43) }],
  ])('refuses %s', (_label, stored, presented) => {
    expect(isCodeExchangeAccepted(stored, presented, NOW)).toBe(false);
  });
});

describe('judgeGrant', () => {
  it('holds while the member credential keeps the epoch the grant was issued under', () => {
    expect(judgeGrant(GRANT, CURRENT_CREDENTIAL)).toBe('valid');
    expect(judgeGrant(GRANT, { sessionEpoch: 3 })).toBe('stale-epoch');
    expect(judgeGrant(GRANT, null)).toBe('unknown-member');
  });
});

describe('judgeRefresh', () => {
  const presentCurrent = { refreshTokenHash: 'current-hash', clientId: 'client-1' };

  it('rotates the current token of a live grant', () => {
    expect(judgeRefresh(GRANT, presentCurrent, CURRENT_CREDENTIAL, NOW)).toBe('rotate');
  });

  it('flags the token rotated away last as a replay', () => {
    expect(
      judgeRefresh(
        GRANT,
        { refreshTokenHash: 'previous-hash', clientId: 'client-1' },
        CURRENT_CREDENTIAL,
        NOW,
      ),
    ).toBe('replayed');
  });

  it('treats a token presented by another client as unknown, even a replayed one', () => {
    expect(
      judgeRefresh(
        GRANT,
        { refreshTokenHash: 'previous-hash', clientId: 'client-2' },
        CURRENT_CREDENTIAL,
        NOW,
      ),
    ).toBe('unknown');
  });

  it('revokes an expired grant and one whose member changed password or is gone', () => {
    expect(
      judgeRefresh({ ...GRANT, refreshExpiresAt: NOW }, presentCurrent, CURRENT_CREDENTIAL, NOW),
    ).toBe('revoke');
    expect(judgeRefresh(GRANT, presentCurrent, { sessionEpoch: 3 }, NOW)).toBe('revoke');
    expect(judgeRefresh(GRANT, presentCurrent, null, NOW)).toBe('revoke');
  });
});

describe('token lifetimes and response', () => {
  it('lets an access token live one hour and a refresh token 90 days', () => {
    expect(ACCESS_TOKEN_LIFETIME_MS).toBe(3_600_000);
    expect(REFRESH_TOKEN_LIFETIME_MS).toBe(7_776_000_000);
    expect(selectTokenExpiries(NOW)).toEqual({
      accessExpiresAt: new Date('2026-10-27T11:00:00.000Z'),
      refreshExpiresAt: new Date('2027-01-25T10:00:00.000Z'),
    });
  });

  it('answers a bearer token scoped to pragma', () => {
    expect(buildTokenResponse('access', 'refresh')).toEqual({
      access_token: 'access',
      token_type: 'Bearer',
      expires_in: 3_600,
      refresh_token: 'refresh',
      scope: 'pragma',
    });
  });
});
