import { createHash, timingSafeEqual } from 'node:crypto';
import {
  AUTHORIZATION_CODE_GRANT,
  isAcceptedResource,
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_SECOND,
  MINUTES_PER_HOUR,
  PRAGMA_SCOPE,
  REFRESH_TOKEN_GRANT,
  SECONDS_PER_MINUTE,
  selectProtectedResourceMetadataUrl,
} from './oauth.core';
import type { TokenRequest } from './oauth.schema';
import type {
  OAuthErrorCode,
  StoredAssistantGrant,
  StoredAuthorizationCode,
  TokenResponse,
} from './oauth.types';

const ACCESS_TOKEN_LIFETIME_SECONDS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
const REFRESH_TOKEN_LIFETIME_DAYS = 90;
const LAST_USE_WRITE_INTERVAL_MINUTES = 5;
const BEARER_PREFIX = 'bearer ';

export const ACCESS_TOKEN_LIFETIME_MS = ACCESS_TOKEN_LIFETIME_SECONDS * MILLISECONDS_PER_SECOND;
export const REFRESH_TOKEN_LIFETIME_MS = REFRESH_TOKEN_LIFETIME_DAYS * MILLISECONDS_PER_DAY;
export const LAST_USE_WRITE_INTERVAL_MS =
  LAST_USE_WRITE_INTERVAL_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

// @FollowsBlueprint core-decision
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isVerifierMatchingChallenge(verifier: string, challenge: string): boolean {
  const computed = Buffer.from(createHash('sha256').update(verifier).digest('base64url'));
  const expected = Buffer.from(challenge);
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

export type TokenGrant =
  | { kind: 'refused'; error: OAuthErrorCode }
  | {
      kind: 'authorization-code';
      code: string;
      clientId: string;
      redirectUri: string;
      codeVerifier: string;
    }
  | { kind: 'refresh-token'; refreshToken: string; clientId: string };

function readAuthorizationCodeGrant(request: TokenRequest): TokenGrant {
  const { code, client_id: clientId, redirect_uri: redirectUri } = request;
  const codeVerifier = request.code_verifier;
  if (
    code === undefined ||
    clientId === undefined ||
    redirectUri === undefined ||
    codeVerifier === undefined
  ) {
    return { kind: 'refused', error: 'invalid_request' };
  }
  return { kind: 'authorization-code', code, clientId, redirectUri, codeVerifier };
}

function readRefreshTokenGrant(request: TokenRequest): TokenGrant {
  const { refresh_token: refreshToken, client_id: clientId } = request;
  if (refreshToken === undefined || clientId === undefined) {
    return { kind: 'refused', error: 'invalid_request' };
  }
  return { kind: 'refresh-token', refreshToken, clientId };
}

export function readTokenGrant(request: TokenRequest, issuer: string): TokenGrant {
  if (!isAcceptedResource(request.resource, issuer)) {
    return { kind: 'refused', error: 'invalid_target' };
  }
  if (request.grant_type === AUTHORIZATION_CODE_GRANT) return readAuthorizationCodeGrant(request);
  if (request.grant_type === REFRESH_TOKEN_GRANT) return readRefreshTokenGrant(request);
  return { kind: 'refused', error: 'unsupported_grant_type' };
}

export function isCodeUsable(expiresAt: Date, now: Date): boolean {
  return now.getTime() < expiresAt.getTime();
}

export interface PresentedCodeExchange {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly codeVerifier: string;
}

export function isCodeExchangeAccepted(
  stored: StoredAuthorizationCode,
  presented: PresentedCodeExchange,
  now: Date,
): boolean {
  if (!isCodeUsable(stored.expiresAt, now)) return false;
  if (stored.clientId !== presented.clientId) return false;
  if (stored.redirectUri !== presented.redirectUri) return false;
  return isVerifierMatchingChallenge(presented.codeVerifier, stored.codeChallenge);
}

export type GrantVerdict = 'valid' | 'unknown-member' | 'stale-epoch';

export interface CredentialEpoch {
  readonly sessionEpoch: number;
}

export function judgeGrant(
  grant: Pick<StoredAssistantGrant, 'sessionEpoch'>,
  credential: CredentialEpoch | null,
): GrantVerdict {
  if (credential === null) return 'unknown-member';
  if (credential.sessionEpoch !== grant.sessionEpoch) return 'stale-epoch';
  return 'valid';
}

export type RefreshVerdict = 'rotate' | 'replayed' | 'revoke' | 'unknown';

export interface PresentedRefresh {
  readonly refreshTokenHash: string;
  readonly clientId: string;
}

export function judgeRefresh(
  grant: StoredAssistantGrant,
  presented: PresentedRefresh,
  credential: CredentialEpoch | null,
  now: Date,
): RefreshVerdict {
  if (grant.clientId !== presented.clientId) return 'unknown';
  if (grant.previousRefreshTokenHash === presented.refreshTokenHash) return 'replayed';
  if (now.getTime() >= grant.refreshExpiresAt.getTime()) return 'revoke';
  if (judgeGrant(grant, credential) !== 'valid') return 'revoke';
  return 'rotate';
}

export interface TokenExpiries {
  readonly accessExpiresAt: Date;
  readonly refreshExpiresAt: Date;
}

export function selectTokenExpiries(now: Date): TokenExpiries {
  return {
    accessExpiresAt: new Date(now.getTime() + ACCESS_TOKEN_LIFETIME_MS),
    refreshExpiresAt: new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS),
  };
}

export function buildTokenResponse(accessToken: string, refreshToken: string): TokenResponse {
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_LIFETIME_SECONDS,
    refresh_token: refreshToken,
    scope: PRAGMA_SCOPE,
  };
}

export function readBearerToken(authorization: string | undefined): string | null {
  if (authorization === undefined) return null;
  if (!authorization.toLowerCase().startsWith(BEARER_PREFIX)) return null;
  const token = authorization.slice(BEARER_PREFIX.length).trim();
  return token.length === 0 ? null : token;
}

export function buildBearerChallenge(issuer: string): string {
  return `Bearer resource_metadata="${selectProtectedResourceMetadataUrl(issuer)}"`;
}

export interface PresentedAccessGrant {
  readonly accessExpiresAt: Date;
  readonly sessionEpoch: number;
}

export type AccessVerdict = GrantVerdict | 'expired';

export function judgeAccessGrant(
  grant: PresentedAccessGrant,
  credential: CredentialEpoch | null,
  now: Date,
): AccessVerdict {
  if (now.getTime() >= grant.accessExpiresAt.getTime()) return 'expired';
  return judgeGrant(grant, credential);
}

export function isLastUseStale(lastUsedAt: Date | null, now: Date): boolean {
  if (lastUsedAt === null) return true;
  return now.getTime() - lastUsedAt.getTime() >= LAST_USE_WRITE_INTERVAL_MS;
}
