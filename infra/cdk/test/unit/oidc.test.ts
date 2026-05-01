import { App, Stack } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { describe, expect, it } from 'vitest';
import {
  GITHUB_OIDC_ISSUER,
  githubActionsPrincipal,
  githubSubClaim,
} from '../../src/internal/oidc.js';

describe('githubSubClaim', () => {
  it('builds an environment-scoped sub claim', () => {
    expect(
      githubSubClaim({ repo: 'a/b', subject: { kind: 'environment', environment: 'prod' } }),
    ).toBe('repo:a/b:environment:prod');
  });

  it('builds a pull_request sub claim', () => {
    expect(githubSubClaim({ repo: 'a/b', subject: { kind: 'pull_request' } })).toBe(
      'repo:a/b:pull_request',
    );
  });

  it('builds a branch sub claim', () => {
    expect(githubSubClaim({ repo: 'a/b', subject: { kind: 'branch', branch: 'main' } })).toBe(
      'repo:a/b:ref:refs/heads/main',
    );
  });

  it('builds an "any" sub claim', () => {
    expect(githubSubClaim({ repo: 'a/b', subject: { kind: 'any' } })).toBe('repo:a/b:*');
  });
});

describe('githubActionsPrincipal', () => {
  it('produces a FederatedPrincipal that synths a trust policy with the issuer + sub claim', () => {
    const stack = new Stack(new App(), 'S');
    const principal = githubActionsPrincipal(
      'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com',
      { repo: 'a/b', subject: { kind: 'environment', environment: 'prod' } },
    );
    const role = new Role(stack, 'R', { assumedBy: principal });
    const doc = role.assumeRolePolicy?.toJSON();
    expect(JSON.stringify(doc)).toContain(GITHUB_OIDC_ISSUER);
    expect(JSON.stringify(doc)).toContain('repo:a/b:environment:prod');
  });
});
