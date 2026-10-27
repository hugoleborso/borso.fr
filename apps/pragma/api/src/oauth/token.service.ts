import { randomBytes, randomUUID } from 'node:crypto';
import { readCredentialOfMember } from '../auth/credentials.service';
import type { TaggedFailure } from '../helpers/observability/error-reporting.adapter';
import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import { readOAuthOrigins } from './oauth.environment';
import {
  claimAuthorizationCode,
  deleteGrant,
  deleteGrantHoldingToken,
  findGrantByRefreshTokenHash,
  hasRotatedGrant,
  insertAssistantGrant,
} from './oauth.repository';
import type { TokenRequest } from './oauth.schema';
import type { OAuthErrorCode, TokenResponse } from './oauth.types';
import {
  buildTokenResponse,
  hashToken,
  isCodeExchangeAccepted,
  judgeRefresh,
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
  { kind: 'issued'; tokens: TokenResponse } | { kind: 'refused'; error: OAuthErrorCode };

const INVALID_GRANT: TokenOutcome = { kind: 'refused', error: 'invalid_grant' };

interface MintedTokens {
  readonly response: TokenResponse;
  readonly accessTokenHash: string;
  readonly refreshTokenHash: string;
}

function mintTokens(): MintedTokens {
  const accessToken = mintOpaqueToken();
  const refreshToken = mintOpaqueToken();
  return {
    response: buildTokenResponse(accessToken, refreshToken),
    accessTokenHash: hashToken(accessToken),
    refreshTokenHash: hashToken(refreshToken),
  };
}

interface CodeExchange {
  readonly code: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly codeVerifier: string;
}

async function exchangeAuthorizationCode(exchange: CodeExchange, now: Date): Promise<TokenOutcome> {
  const stored = await claimAuthorizationCode(hashToken(exchange.code));
  if (stored === null || !isCodeExchangeAccepted(stored, exchange, now)) return INVALID_GRANT;
  const credential = await readCredentialOfMember(stored.memberId);
  if (credential === null) return INVALID_GRANT;
  const minted = mintTokens();
  await insertAssistantGrant({
    id: randomUUID(),
    clientId: stored.clientId,
    memberId: stored.memberId,
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
  const presentedHash = hashToken(exchange.refreshToken);
  const grant = await findGrantByRefreshTokenHash(presentedHash);
  if (grant === null) return INVALID_GRANT;
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
    await deleteGrant(grant.id);
    exchange.reportFailure({
      name: TOKEN_REPLAY_FAILURE,
      tags: { 'oauth.client': grant.clientId },
    });
    recordProductEvent({ event: 'assistant_grant_revoked', via: 'replay' });
    return INVALID_GRANT;
  }
  const isRevoked = verdict === 'revoke';
  if (isRevoked) {
    await deleteGrant(grant.id);
    return INVALID_GRANT;
  }
  const minted = mintTokens();
  const hasRotated = await hasRotatedGrant({
    grantId: grant.id,
    presentedRefreshTokenHash: presentedHash,
    refreshTokenHash: minted.refreshTokenHash,
    accessTokenHash: minted.accessTokenHash,
    ...selectTokenExpiries(exchange.now),
  });
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
