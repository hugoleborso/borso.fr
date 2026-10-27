import {
  buildRedirectLocation,
  isAcceptedRedirectUri,
  isRegisteredRedirectUri,
} from './redirect-uri.core';
import type { AuthorizationQuery, ClientRegistration } from './oauth.schema';
import type {
  AuthorizationRequest,
  AuthorizationServerMetadata,
  KnownAssistantClient,
  OAuthErrorCode,
  ProtectedResourceMetadata,
  RegisteredClientInformation,
} from './oauth.types';

export const MILLISECONDS_PER_SECOND = 1_000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
export const MILLISECONDS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const AUTHORIZATION_CODE_LIFETIME_SECONDS = 60;
const UNUSED_CLIENT_LIFETIME_DAYS = 30;

export const AUTHORIZATION_CODE_LIFETIME_MS =
  AUTHORIZATION_CODE_LIFETIME_SECONDS * MILLISECONDS_PER_SECOND;
export const UNUSED_CLIENT_LIFETIME_MS = UNUSED_CLIENT_LIFETIME_DAYS * MILLISECONDS_PER_DAY;

export const PRAGMA_SCOPE = 'pragma';
export const AUTHORIZATION_CODE_GRANT = 'authorization_code';
export const REFRESH_TOKEN_GRANT = 'refresh_token';
const RESOURCE_NAME = 'pragma';
const MCP_PATH = '/mcp';
const CONSENT_PATH = '/oauth/consent';
const AUTHORIZATION_CODE_RESPONSE_TYPE = 'code';
const PKCE_METHOD = 'S256';
const CLIENT_NAME_HOST_SEPARATOR = ', ';
const PUBLIC_CLIENT_AUTH_METHOD = 'none';
const BEARER_HEADER_METHOD = 'header';
const S256_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

// @FollowsBlueprint core-decision
export function selectProtectedResource(issuer: string): string {
  return `${issuer}${MCP_PATH}`;
}

export function describeAuthorizationServer(issuer: string): AuthorizationServerMetadata {
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    response_types_supported: [AUTHORIZATION_CODE_RESPONSE_TYPE],
    grant_types_supported: [AUTHORIZATION_CODE_GRANT, REFRESH_TOKEN_GRANT],
    code_challenge_methods_supported: [PKCE_METHOD],
    token_endpoint_auth_methods_supported: [PUBLIC_CLIENT_AUTH_METHOD],
    revocation_endpoint_auth_methods_supported: [PUBLIC_CLIENT_AUTH_METHOD],
    scopes_supported: [PRAGMA_SCOPE],
  };
}

export function describeProtectedResource(issuer: string): ProtectedResourceMetadata {
  return {
    resource: selectProtectedResource(issuer),
    resource_name: RESOURCE_NAME,
    authorization_servers: [issuer],
    scopes_supported: [PRAGMA_SCOPE],
    bearer_methods_supported: [BEARER_HEADER_METHOD],
  };
}

export type ClientRegistrationVerdict =
  | { kind: 'invalid-redirect-uri' }
  | { kind: 'valid'; client: KnownAssistantClient; information: RegisteredClientInformation };

function selectClientName(registration: ClientRegistration): string {
  const hosts = new Set(registration.redirect_uris.map((uri) => new URL(uri).hostname));
  return registration.client_name ?? [...hosts].join(CLIENT_NAME_HOST_SEPARATOR);
}

export function judgeClientRegistration(
  registration: ClientRegistration,
  clientId: string,
  now: Date,
): ClientRegistrationVerdict {
  if (!registration.redirect_uris.every(isAcceptedRedirectUri)) {
    return { kind: 'invalid-redirect-uri' };
  }
  const name = selectClientName(registration);
  return {
    kind: 'valid',
    client: { id: clientId, name, redirectUris: registration.redirect_uris },
    information: {
      client_id: clientId,
      client_id_issued_at: Math.floor(now.getTime() / MILLISECONDS_PER_SECOND),
      client_name: name,
      redirect_uris: registration.redirect_uris,
      grant_types: [AUTHORIZATION_CODE_GRANT, REFRESH_TOKEN_GRANT],
      response_types: [AUTHORIZATION_CODE_RESPONSE_TYPE],
      token_endpoint_auth_method: PUBLIC_CLIENT_AUTH_METHOD,
    },
  };
}

export type AuthorizationVerdict =
  | { kind: 'refused'; error: OAuthErrorCode }
  | {
      kind: 'redirect-with-error';
      redirectUri: string;
      error: OAuthErrorCode;
      state: string | undefined;
    }
  | { kind: 'valid'; request: AuthorizationRequest };

export function isAcceptedResource(resource: string | undefined, issuer: string): boolean {
  return resource === undefined || resource === selectProtectedResource(issuer);
}

function readWellFormedChallenge(query: AuthorizationQuery): string | null {
  const challenge = String(query.code_challenge);
  const isWellFormed =
    query.code_challenge_method === PKCE_METHOD && S256_CHALLENGE_PATTERN.test(challenge);
  return isWellFormed ? challenge : null;
}

export function judgeAuthorizationRequest(
  query: AuthorizationQuery,
  client: KnownAssistantClient | null,
  issuer: string,
): AuthorizationVerdict {
  if (client === null) return { kind: 'refused', error: 'invalid_client' };
  const redirectUri = query.redirect_uri;
  // Stryker disable next-line ConditionalExpression: equivalent mutant, an absent address does not parse, so isRegisteredRedirectUri refuses it exactly like this early answer.
  if (redirectUri === undefined || !isRegisteredRedirectUri(redirectUri, client.redirectUris)) {
    return { kind: 'refused', error: 'invalid_redirect_uri' };
  }
  const refuseWith = (error: OAuthErrorCode): AuthorizationVerdict => ({
    kind: 'redirect-with-error',
    redirectUri,
    error,
    state: query.state,
  });
  if (query.response_type !== AUTHORIZATION_CODE_RESPONSE_TYPE) {
    return refuseWith('unsupported_response_type');
  }
  const codeChallenge = readWellFormedChallenge(query);
  if (codeChallenge === null) return refuseWith('invalid_request');
  if (!isAcceptedResource(query.resource, issuer)) return refuseWith('invalid_target');
  return {
    kind: 'valid',
    request: { clientId: client.id, redirectUri, codeChallenge, state: query.state },
  };
}

export function buildConsentLocation(consentOrigin: string, query: AuthorizationQuery): string {
  return buildRedirectLocation(`${consentOrigin}${CONSENT_PATH}`, query);
}

export function selectCodeExpiry(now: Date): Date {
  return new Date(now.getTime() + AUTHORIZATION_CODE_LIFETIME_MS);
}

export function selectSweepFloor(now: Date): Date {
  return new Date(now.getTime() - UNUSED_CLIENT_LIFETIME_MS);
}
