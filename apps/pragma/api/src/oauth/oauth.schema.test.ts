import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  assistantGrantTable,
  assistantGrantIdParamSchema,
  authorizationQuerySchema,
  clientRegistrationSchema,
  consentDecisionSchema,
  revocationRequestSchema,
  tokenRequestSchema,
} from './oauth.schema';

const VERIFIER_FLOOR = 43;
const VERIFIER_CEILING = 128;
const REDIRECT_URIS_CEILING = 10;

describe('clientRegistrationSchema', () => {
  it('accepts the registration Claude Code sends', () => {
    const claudeCodeRegistration = clientRegistrationSchema.safeParse({
      client_name: 'Claude Code (pragma)',
      redirect_uris: ['http://localhost:47823/callback'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    });

    expect(claudeCodeRegistration.success).toBe(true);
  });

  it('refuses a registration with no redirect address, or too many', () => {
    expect(clientRegistrationSchema.safeParse({ redirect_uris: [] }).success).toBe(false);
    expect(
      clientRegistrationSchema.safeParse({
        redirect_uris: Array.from({ length: REDIRECT_URIS_CEILING + 1 }, () => 'https://a.b/c'),
      }).success,
    ).toBe(false);
  });

  it('refuses a blank client name', () => {
    expect(
      clientRegistrationSchema.safeParse({ redirect_uris: ['https://a.b/c'], client_name: ' ' })
        .success,
    ).toBe(false);
  });
});

describe('authorizationQuerySchema and consentDecisionSchema', () => {
  it('accepts an empty query, which the authorization rules then judge', () => {
    expect(authorizationQuerySchema.safeParse({}).success).toBe(true);
  });

  it('requires an allow or deny decision on consent', () => {
    expect(consentDecisionSchema.safeParse({ decision: 'allow' }).success).toBe(true);
    expect(consentDecisionSchema.safeParse({ decision: 'maybe' }).success).toBe(false);
  });
});

function isVerifierAccepted(codeVerifier: string): boolean {
  return tokenRequestSchema.safeParse({
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  }).success;
}

describe('tokenRequestSchema', () => {
  it('bounds the code verifier to the 43 to 128 unreserved characters of RFC 7636', () => {
    expect(isVerifierAccepted('a'.repeat(VERIFIER_FLOOR))).toBe(true);
    expect(isVerifierAccepted('a'.repeat(VERIFIER_CEILING))).toBe(true);
    expect(isVerifierAccepted('a'.repeat(VERIFIER_FLOOR - 1))).toBe(false);
    expect(isVerifierAccepted('a'.repeat(VERIFIER_CEILING + 1))).toBe(false);
    expect(isVerifierAccepted(`${'a'.repeat(VERIFIER_FLOOR)}+`)).toBe(false);
  });

  it('requires a grant type', () => {
    expect(tokenRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('revocationRequestSchema and assistantGrantIdParamSchema', () => {
  it('requires a token to revoke and a uuid grant id', () => {
    expect(revocationRequestSchema.safeParse({ token: '' }).success).toBe(false);
    expect(revocationRequestSchema.safeParse({ token: 'abc' }).success).toBe(true);
    expect(assistantGrantIdParamSchema.safeParse({ grantId: 'nope' }).success).toBe(false);
  });
});

describe('assistantGrantTable', () => {
  it('indexes every token hash as unique, and the member for the Account list', () => {
    const indexes = getTableConfig(assistantGrantTable).indexes.map((index) => ({
      name: index.config.name,
      isUnique: index.config.unique,
    }));

    expect(indexes).toEqual([
      { name: 'assistant_grant_refresh_token_hash_unique', isUnique: true },
      { name: 'assistant_grant_previous_refresh_token_hash_unique', isUnique: true },
      { name: 'assistant_grant_access_token_hash_unique', isUnique: true },
      { name: 'assistant_grant_member_idx', isUnique: false },
    ]);
  });
});
