import { describe, expect, it } from 'vitest';
import {
  AUTHORIZATION_CODE_LIFETIME_MS,
  buildConsentLocation,
  describeAuthorizationServer,
  describeProtectedResource,
  isAcceptedResource,
  judgeAuthorizationRequest,
  judgeClientRegistration,
  selectCodeExpiry,
  selectProtectedResource,
  selectSweepFloor,
  UNUSED_CLIENT_LIFETIME_MS,
} from './oauth.core';
import type { AuthorizationQuery } from './oauth.schema';
import type { KnownAssistantClient } from './oauth.types';

const ISSUER = 'https://pragma.borso.fr';
const NOW = new Date('2026-10-27T10:00:00.000Z');
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const CLIENT: KnownAssistantClient = {
  id: 'client-1',
  name: 'Claude Code',
  redirectUris: ['http://127.0.0.1/callback'],
};
const VALID_QUERY: AuthorizationQuery = {
  response_type: 'code',
  client_id: 'client-1',
  redirect_uri: 'http://127.0.0.1:47823/callback',
  code_challenge: CHALLENGE,
  code_challenge_method: 'S256',
  state: 'opaque-state',
};

// @FollowsBlueprint test-pure-unit
describe('discovery metadata', () => {
  it('describes an authorization server for public clients using PKCE S256 only', () => {
    expect(describeAuthorizationServer(ISSUER)).toEqual({
      issuer: ISSUER,
      authorization_endpoint: 'https://pragma.borso.fr/oauth/authorize',
      token_endpoint: 'https://pragma.borso.fr/oauth/token',
      registration_endpoint: 'https://pragma.borso.fr/oauth/register',
      revocation_endpoint: 'https://pragma.borso.fr/oauth/revoke',
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      revocation_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['pragma'],
    });
  });

  it('describes /mcp as the protected resource this issuer serves', () => {
    expect(selectProtectedResource(ISSUER)).toBe('https://pragma.borso.fr/mcp');
    expect(describeProtectedResource(ISSUER)).toEqual({
      resource: 'https://pragma.borso.fr/mcp',
      resource_name: 'pragma',
      authorization_servers: [ISSUER],
      scopes_supported: ['pragma'],
      bearer_methods_supported: ['header'],
    });
  });
});

describe('isAcceptedResource', () => {
  it('accepts no resource, or exactly the MCP address', () => {
    expect(isAcceptedResource(undefined, ISSUER)).toBe(true);
    expect(isAcceptedResource('https://pragma.borso.fr/mcp', ISSUER)).toBe(true);
    expect(isAcceptedResource('https://pragma.borso.fr/', ISSUER)).toBe(false);
  });
});

describe('judgeClientRegistration', () => {
  it('registers a public client named as it asked, whatever auth method it asked for', () => {
    const verdict = judgeClientRegistration(
      {
        client_name: 'Claude Code',
        redirect_uris: ['http://localhost:47823/callback'],
        token_endpoint_auth_method: 'client_secret_post',
      },
      'client-1',
      NOW,
    );

    expect(verdict).toEqual({
      kind: 'valid',
      client: {
        id: 'client-1',
        name: 'Claude Code',
        redirectUris: ['http://localhost:47823/callback'],
      },
      information: {
        client_id: 'client-1',
        client_id_issued_at: 1_793_095_200,
        client_name: 'Claude Code',
        redirect_uris: ['http://localhost:47823/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      },
    });
  });

  it('names an unnamed client after the distinct hosts it redirects to', () => {
    const verdict = judgeClientRegistration(
      {
        redirect_uris: [
          'http://127.0.0.1/callback',
          'http://127.0.0.1/other',
          'https://chat.mistral.ai/cb',
        ],
      },
      'client-2',
      new Date(1_500),
    );

    expect(verdict.kind === 'valid' && verdict.client.name).toBe('127.0.0.1, chat.mistral.ai');
    expect(verdict.kind === 'valid' && verdict.information.client_id_issued_at).toBe(1);
  });

  it('refuses a registration with any unacceptable redirect address', () => {
    expect(
      judgeClientRegistration(
        { redirect_uris: ['https://claude.ai/cb', 'http://example.com/cb'] },
        'client-3',
        NOW,
      ),
    ).toEqual({ kind: 'invalid-redirect-uri' });
  });
});

describe('judgeAuthorizationRequest', () => {
  it('accepts a well-formed request from a registered loopback client on any port', () => {
    expect(judgeAuthorizationRequest(VALID_QUERY, CLIENT, ISSUER)).toEqual({
      kind: 'valid',
      request: {
        clientId: 'client-1',
        redirectUri: 'http://127.0.0.1:47823/callback',
        codeChallenge: CHALLENGE,
        state: 'opaque-state',
      },
    });
  });

  it('accepts the MCP address as the resource', () => {
    const query = { ...VALID_QUERY, resource: 'https://pragma.borso.fr/mcp' };

    expect(judgeAuthorizationRequest(query, CLIENT, ISSUER).kind).toBe('valid');
  });

  it('never redirects for an unknown client or an unregistered redirect address', () => {
    expect(judgeAuthorizationRequest(VALID_QUERY, null, ISSUER)).toEqual({
      kind: 'refused',
      error: 'invalid_client',
    });
    expect(
      judgeAuthorizationRequest(
        { ...VALID_QUERY, redirect_uri: 'https://evil.example/cb' },
        CLIENT,
        ISSUER,
      ),
    ).toEqual({ kind: 'refused', error: 'invalid_redirect_uri' });
    expect(
      judgeAuthorizationRequest({ ...VALID_QUERY, redirect_uri: undefined }, CLIENT, ISSUER),
    ).toEqual({ kind: 'refused', error: 'invalid_redirect_uri' });
  });

  it.each<[string, AuthorizationQuery, string]>([
    [
      'a response type other than code',
      { ...VALID_QUERY, response_type: 'token' },
      'unsupported_response_type',
    ],
    [
      'the plain PKCE method',
      { ...VALID_QUERY, code_challenge_method: 'plain' },
      'invalid_request',
    ],
    ['no PKCE method', { ...VALID_QUERY, code_challenge_method: undefined }, 'invalid_request'],
    ['no challenge', { ...VALID_QUERY, code_challenge: undefined }, 'invalid_request'],
    [
      'a challenge one character short',
      { ...VALID_QUERY, code_challenge: CHALLENGE.slice(1) },
      'invalid_request',
    ],
    [
      'a challenge one character long',
      { ...VALID_QUERY, code_challenge: `${CHALLENGE}A` },
      'invalid_request',
    ],
    [
      'a challenge with a padding sign',
      { ...VALID_QUERY, code_challenge: `${CHALLENGE.slice(1)}=` },
      'invalid_request',
    ],
    [
      'a challenge with a leading padding sign',
      { ...VALID_QUERY, code_challenge: `=${CHALLENGE.slice(1)}` },
      'invalid_request',
    ],
    [
      'a challenge with a trailing extra word',
      { ...VALID_QUERY, code_challenge: `${CHALLENGE} x` },
      'invalid_request',
    ],
    [
      'a challenge prefixed by an extra word',
      { ...VALID_QUERY, code_challenge: `x ${CHALLENGE}` },
      'invalid_request',
    ],
    [
      'another resource',
      { ...VALID_QUERY, resource: 'https://elsewhere.example/mcp' },
      'invalid_target',
    ],
  ])('redirects back with an error for %s', (_label, query, error) => {
    expect(judgeAuthorizationRequest(query, CLIENT, ISSUER)).toEqual({
      kind: 'redirect-with-error',
      redirectUri: 'http://127.0.0.1:47823/callback',
      error,
      state: 'opaque-state',
    });
  });
});

describe('buildConsentLocation', () => {
  it('carries the whole authorization request to the site consent page', () => {
    expect(buildConsentLocation('https://pragma-pr-1.preview.borso.fr', VALID_QUERY)).toBe(
      'https://pragma-pr-1.preview.borso.fr/oauth/consent?response_type=code&client_id=client-1&redirect_uri=http%3A%2F%2F127.0.0.1%3A47823%2Fcallback&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256&state=opaque-state',
    );
  });
});

describe('lifetimes', () => {
  it('lets a code live 60 seconds and an unused client 30 days', () => {
    expect(AUTHORIZATION_CODE_LIFETIME_MS).toBe(60_000);
    expect(UNUSED_CLIENT_LIFETIME_MS).toBe(2_592_000_000);
    expect(selectCodeExpiry(NOW)).toEqual(new Date('2026-10-27T10:01:00.000Z'));
    expect(selectSweepFloor(NOW)).toEqual(new Date('2026-09-27T10:00:00.000Z'));
  });
});
