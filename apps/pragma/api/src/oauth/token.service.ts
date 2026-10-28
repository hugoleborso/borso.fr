import { randomBytes, randomUUID } from 'node:crypto';
import { readCredentialOfMember } from '../auth/credentials.service';
import type { TaggedFailure } from '../helpers/observability/error-reporting.adapter';
import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import {
  isConflictAbort,
  retryingConflictAborts,
} from '../helpers/persistence/conflict-abort.core';
import { readOAuthOrigins } from './oauth.environment';
import {
  claimAuthorizationCode,
  deleteGrant,
  deleteGrantHoldingToken,
  findGrantByAccessTokenHash,
  findGrantByRefreshFamilyHash,
  hasRotatedGrant,
  insertAssistantGrant,
  type AccessGrant,
  updateGrantLastUse,
} from './oauth.repository';
import type { TokenRequest } from './oauth.schema';
import type { OAuthErrorCode, TokenResponse } from './oauth.types';
import {
  buildBearerChallenge,
  buildTokenResponse,
  composeRefreshToken,
  hashToken,
  isCodeExchangeAccepted,
  isLastUseStale,
  judgeAccessGrant,
  judgeRefresh,
  readBearerToken,
  readRefreshTokenFamily,
  readTokenGrant,
  selectTokenExpiries,
} from './token.core';

const OPAQUE_TOKEN_BYTES = 32;
const TOKEN_REPLAY_FAILURE = 'OAuthTokenReplay';

export type ReportFailure = (failure: TaggedFailure) => void;

export function mintOpaqueToken(): string {
  return randomBytes(OPAQUE_TOKEN_BYTES).toString('base64url');
}

export type TokenOutcome =
  | { kind: 'issued'; tokens: TokenResponse }
  | { kind: 'refused'; error: OAuthErrorCode };

const INVALID_GRANT: TokenOutcome = { kind: 'refused', error: 'invalid_grant' };

interface MintedTokens {
  readonly response: TokenResponse;
  readonly accessTokenHash: string;
  readonly refreshTokenHash: string;
}

function mintTokens(refreshFamily: string): MintedTokens {
  const accessToken = mintOpaqueToken();
  const refreshToken = composeRefreshToken(refreshFamily, mintOpaqueToken());
  return {
    response: buildTokenResponse(accessToken, refreshToken),
    accessTokenHash: hashToken(accessToken),
    refreshTokenHash: hashToken(refreshToken),
  };
}

async function claimingOrLosing<Claimed>(
  claim: () => Promise<Claimed>,
  lost: Claimed,
): Promise<Claimed> {
  try {
    return await claim();
  } catch (error) {
    if (!isConflictAbort(error)) throw error;
    return lost;
  }
}

interface CodeExchange {
  readonly code: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly codeVerifier: string;
}

async function exchangeAuthorizationCode(exchange: CodeExchange, now: Date): Promise<TokenOutcome> {
  const codeHash = hashToken(exchange.code);
  const stored = await claimingOrLosing(async () => await claimAuthorizationCode(codeHash), null);
  if (stored === null || !isCodeExchangeAccepted(stored, exchange, now)) return INVALID_GRANT;
  const credential = await readCredentialOfMember(stored.memberId);
  if (credential === null) return INVALID_GRANT;
  const refreshFamily = mintOpaqueToken();
  const minted = mintTokens(refreshFamily);
  await insertAssistantGrant({
    id: randomUUID(),
    clientId: stored.clientId,
    memberId: stored.memberId,
    refreshFamilyHash: hashToken(refreshFamily),
    refreshTokenHash: minted.refreshTokenHash,
    accessTokenHash: minted.accessTokenHash,
    sessionEpoch: credential.sessionEpoch,
    createdAt: now,
    ...selectTokenExpiries(now),
  });
  recordProductEvent({ event: 'assistant_grant_created' });
  return { kind: 'issued', tokens: minted.response };
}

interface RefreshExchange {
  readonly refreshToken: string;
  readonly clientId: string;
  readonly now: Date;
  readonly reportFailure: ReportFailure;
}

async function exchangeRefreshToken(exchange: RefreshExchange): Promise<TokenOutcome> {
  const refreshFamily = readRefreshTokenFamily(exchange.refreshToken);
  if (refreshFamily === null) return INVALID_GRANT;
  const grant = await findGrantByRefreshFamilyHash(hashToken(refreshFamily));
  if (grant === null) return INVALID_GRANT;
  const presentedHash = hashToken(exchange.refreshToken);
  const credential = await readCredentialOfMember(grant.memberId);
  const verdict = judgeRefresh(
    grant,
    { refreshTokenHash: presentedHash, clientId: exchange.clientId },
    credential,
    exchange.now,
  );
  if (verdict === 'unknown') return INVALID_GRANT;
  const isReplayed = verdict === 'replayed';
  if (isReplayed) {
    await retryingConflictAborts(async () => {
      await deleteGrant(grant.id);
    });
    exchange.reportFailure({
      name: TOKEN_REPLAY_FAILURE,
      tags: { 'oauth.client': grant.clientId },
    });
    recordProductEvent({ event: 'assistant_grant_revoked', via: 'replay' });
    return INVALID_GRANT;
  }
  const isRevoked = verdict === 'revoke';
  if (isRevoked) {
    await retryingConflictAborts(async () => {
      await deleteGrant(grant.id);
    });
    return INVALID_GRANT;
  }
  const minted = mintTokens(refreshFamily);
  const rotation = {
    grantId: grant.id,
    presentedRefreshTokenHash: presentedHash,
    refreshTokenHash: minted.refreshTokenHash,
    accessTokenHash: minted.accessTokenHash,
    ...selectTokenExpiries(exchange.now),
  };
  const hasRotated = await claimingOrLosing(async () => await hasRotatedGrant(rotation), false);
  if (!hasRotated) return INVALID_GRANT;
  return { kind: 'issued', tokens: minted.response };
}

export interface ExchangeTokenParams {
  readonly request: TokenRequest;
  readonly now: Date;
  readonly reportFailure: ReportFailure;
}

// @FollowsBlueprint service-clock-injected
export async function exchangeToken(params: ExchangeTokenParams): Promise<TokenOutcome> {
  const grant = readTokenGrant(params.request, readOAuthOrigins().issuer);
  if (grant.kind === 'refused') return grant;
  if (grant.kind === 'authorization-code')
    return await exchangeAuthorizationCode(grant, params.now);
  return await exchangeRefreshToken({
    refreshToken: grant.refreshToken,
    clientId: grant.clientId,
    now: params.now,
    reportFailure: params.reportFailure,
  });
}

export async function revokeToken(token: string): Promise<void> {
  const deletedCount = await deleteGrantHoldingToken(hashToken(token));
  if (deletedCount === 0) return;
  recordProductEvent({ event: 'assistant_grant_revoked', via: 'client' });
}

export type BearerVerdict =
  | { kind: 'authenticated'; memberId: string }
  | { kind: 'refused'; challenge: string };

async function recordGrantUse(grant: AccessGrant, now: Date): Promise<void> {
  if (!isLastUseStale(grant.lastUsedAt, now)) return;
  try {
    await updateGrantLastUse(grant.id, now);
  } catch (error) {
    if (!isConflictAbort(error)) throw error;
    console.warn('assistant grant last use lost a write conflict', grant.id);
  }
}

// @FollowsBlueprint service-clock-injected
export async function authenticateAccessToken(
  authorization: string | undefined,
  now: Date,
): Promise<BearerVerdict> {
  const refused: BearerVerdict = {
    kind: 'refused',
    challenge: buildBearerChallenge(readOAuthOrigins().issuer),
  };
  const token = readBearerToken(authorization);
  if (token === null) return refused;
  const grant = await findGrantByAccessTokenHash(hashToken(token));
  if (grant === null) return refused;
  const credential = await readCredentialOfMember(grant.memberId);
  if (judgeAccessGrant(grant, credential, now) !== 'valid') return refused;
  await recordGrantUse(grant, now);
  return { kind: 'authenticated', memberId: grant.memberId };
}
