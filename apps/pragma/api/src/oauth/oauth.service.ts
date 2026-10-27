import { randomUUID } from 'node:crypto';
import { consumeAttempt } from '../auth/credentials.service';
import { ASSISTANT_REGISTRATION_BUDGET } from '../auth/rate-limit.utils';
import type { DatabaseExecutor } from '../database/client';
import { reportTaggedFailure } from '../helpers/observability/error-reporting.adapter';
import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import {
  buildConsentLocation,
  describeAuthorizationServer,
  describeProtectedResource,
  judgeAuthorizationRequest,
  judgeClientRegistration,
  selectCodeExpiry,
  selectSweepFloor,
  type AuthorizationVerdict,
} from './oauth.core';
import { buildRedirectLocation } from './redirect-uri.core';
import { hashToken } from './token.core';
import { mintOpaqueToken, type ReportFailure } from './token.service';
import { readOAuthOrigins } from './oauth.environment';
import {
  deleteAssistantStateOfMemberWithin,
  deleteAuthorizationCodesExpiredBefore,
  deleteClientsWithoutGrantCreatedBefore,
  deleteGrantOfMember,
  findAssistantClient,
  findMemberFirstName,
  insertAssistantClient,
  insertAuthorizationCode,
  listGrantsOfMember,
} from './oauth.repository';
import type { AuthorizationQuery, ClientRegistration } from './oauth.schema';
import type {
  AssistantGrantSummary,
  ConsentDecision,
  OAuthErrorCode,
  RegisteredClientInformation,
} from './oauth.types';

const REGISTRATION_RATE_LIMITED_FAILURE = 'OAuthRegistrationRateLimited';

// @FollowsBlueprint service-facade-reexport
export { readClientAddress } from '../helpers/client-address/client-address.environment';
export { exchangeToken, type ReportFailure, revokeToken } from './token.service';

export const reportFailureToErrorTracking: ReportFailure = reportTaggedFailure;

function readAuthorizationServerIssuer(): string {
  return readOAuthOrigins().issuer;
}

export function describeAuthorizationServerMetadata() {
  return describeAuthorizationServer(readAuthorizationServerIssuer());
}

export function describeProtectedResourceMetadata() {
  return describeProtectedResource(readAuthorizationServerIssuer());
}

export type RegistrationOutcome =
  | { kind: 'registered'; information: RegisteredClientInformation }
  | { kind: 'rate-limited' }
  | { kind: 'invalid-redirect-uri' };

export interface RegisterAssistantClientParams {
  readonly registration: ClientRegistration;
  readonly clientAddress: string;
  readonly now: Date;
  readonly reportFailure: ReportFailure;
}

// @FollowsBlueprint service-clock-injected
export async function registerAssistantClient(
  params: RegisterAssistantClientParams,
): Promise<RegistrationOutcome> {
  const attempt = await consumeAttempt(
    ASSISTANT_REGISTRATION_BUDGET,
    params.clientAddress,
    params.now,
  );
  if (attempt.isLimited) {
    params.reportFailure({ name: REGISTRATION_RATE_LIMITED_FAILURE, tags: {} });
    return { kind: 'rate-limited' };
  }
  const verdict = judgeClientRegistration(params.registration, randomUUID(), params.now);
  if (verdict.kind === 'invalid-redirect-uri') return verdict;
  await deleteClientsWithoutGrantCreatedBefore(selectSweepFloor(params.now));
  await insertAssistantClient(verdict.client, params.now);
  recordProductEvent({ event: 'assistant_client_registered' });
  return { kind: 'registered', information: verdict.information };
}

async function judgeQuery(
  query: AuthorizationQuery,
  issuer: string,
): Promise<AuthorizationVerdict> {
  const client = query.client_id === undefined ? null : await findAssistantClient(query.client_id);
  return judgeAuthorizationRequest(query, client, issuer);
}

export type AuthorizationStart =
  { kind: 'redirect'; location: string } | { kind: 'refused'; error: OAuthErrorCode };

export async function beginAuthorization(query: AuthorizationQuery): Promise<AuthorizationStart> {
  const origins = readOAuthOrigins();
  const verdict = await judgeQuery(query, origins.issuer);
  if (verdict.kind === 'refused') return verdict;
  if (verdict.kind === 'redirect-with-error') {
    return {
      kind: 'redirect',
      location: buildRedirectLocation(verdict.redirectUri, {
        error: verdict.error,
        state: verdict.state,
      }),
    };
  }
  return { kind: 'redirect', location: buildConsentLocation(origins.consentOrigin, query) };
}

export type ConsentDescription =
  | { kind: 'described'; clientName: string; memberFirstName: string }
  | { kind: 'invalid-authorization-request' };

export async function describeConsent(
  query: AuthorizationQuery,
  memberId: string,
): Promise<ConsentDescription> {
  const verdict = await judgeQuery(query, readAuthorizationServerIssuer());
  if (verdict.kind !== 'valid') return { kind: 'invalid-authorization-request' };
  const client = await findAssistantClient(verdict.request.clientId);
  const memberFirstName = await findMemberFirstName(memberId);
  if (client === null || memberFirstName === null) {
    return { kind: 'invalid-authorization-request' };
  }
  return { kind: 'described', clientName: client.name, memberFirstName };
}

export type ConsentOutcome =
  { kind: 'decided'; redirectTo: string } | { kind: 'invalid-authorization-request' };

export interface DecideConsentParams {
  readonly query: AuthorizationQuery;
  readonly decision: ConsentDecision;
  readonly memberId: string;
  readonly now: Date;
}

// @FollowsBlueprint service-clock-injected
export async function decideConsent(params: DecideConsentParams): Promise<ConsentOutcome> {
  const verdict = await judgeQuery(params.query, readAuthorizationServerIssuer());
  if (verdict.kind !== 'valid') return { kind: 'invalid-authorization-request' };
  const { request } = verdict;
  if (params.decision === 'deny') {
    return {
      kind: 'decided',
      redirectTo: buildRedirectLocation(request.redirectUri, {
        error: 'access_denied',
        state: request.state,
      }),
    };
  }
  const code = mintOpaqueToken();
  await deleteAuthorizationCodesExpiredBefore(params.now);
  await insertAuthorizationCode(hashToken(code), {
    clientId: request.clientId,
    memberId: params.memberId,
    redirectUri: request.redirectUri,
    codeChallenge: request.codeChallenge,
    expiresAt: selectCodeExpiry(params.now),
  });
  return {
    kind: 'decided',
    redirectTo: buildRedirectLocation(request.redirectUri, { code, state: request.state }),
  };
}

export async function listAssistantGrants(memberId: string): Promise<AssistantGrantSummary[]> {
  return await listGrantsOfMember(memberId);
}

export type GrantRevocationOutcome = { kind: 'revoked' } | { kind: 'assistant-grant-not-found' };

export async function revokeAssistantGrant(
  memberId: string,
  grantId: string,
): Promise<GrantRevocationOutcome> {
  const deletedCount = await deleteGrantOfMember(memberId, grantId);
  if (deletedCount === 0) return { kind: 'assistant-grant-not-found' };
  recordProductEvent({ event: 'assistant_grant_revoked', via: 'account' });
  return { kind: 'revoked' };
}

// @FollowsBlueprint repository-owned-transaction
export async function deleteAssistantStateOfDeletedMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await deleteAssistantStateOfMemberWithin(executor, memberId);
}
