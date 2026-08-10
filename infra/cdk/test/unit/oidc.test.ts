import { App, Stack } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { describe, expect, it } from 'vitest';
import {
  GITHUB_OIDC_ISSUER,
  githubActionsPrincipal,
  githubSubClaims,
} from '../../src/internal/oidc.js';

describe('githubSubClaims', () => {
  it('builds an environment-scoped sub claim', () => {
    expect(
      githubSubClaims({ repo: 'a/b', subjects: [{ kind: 'environment', environment: 'prod' }] }),
    ).toStrictEqual(['repo:a/b:environment:prod']);
  });

  it('builds a pull_request sub claim', () => {
    expect(githubSubClaims({ repo: 'a/b', subjects: [{ kind: 'pull_request' }] })).toStrictEqual([
      'repo:a/b:pull_request',
    ]);
  });

  it('builds a branch sub claim', () => {
    expect(
      githubSubClaims({ repo: 'a/b', subjects: [{ kind: 'branch', branch: 'main' }] }),
    ).toStrictEqual(['repo:a/b:ref:refs/heads/main']);
  });

  it('builds an "any" sub claim', () => {
    expect(githubSubClaims({ repo: 'a/b', subjects: [{ kind: 'any' }] })).toStrictEqual([
      'repo:a/b:*',
    ]);
  });

  it('builds one claim per subject, in order, for a role assumed from several triggers', () => {
    expect(
      githubSubClaims({
        repo: 'a/b',
        subjects: [{ kind: 'pull_request' }, { kind: 'branch', branch: 'main' }],
      }),
    ).toStrictEqual(['repo:a/b:pull_request', 'repo:a/b:ref:refs/heads/main']);
  });

  it('returns nothing for an empty subject list', () => {
    expect(githubSubClaims({ repo: 'a/b', subjects: [] })).toStrictEqual([]);
  });
});

describe('githubActionsPrincipal', () => {
  it('produces a FederatedPrincipal that synths a trust policy with the issuer + sub claim', () => {
    const stack = new Stack(new App(), 'S');
    const principal = githubActionsPrincipal(
      'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com',
      { repo: 'a/b', subjects: [{ kind: 'environment', environment: 'prod' }] },
    );
    const role = new Role(stack, 'R', { assumedBy: principal });
    const doc = role.assumeRolePolicy?.toJSON();
    expect(JSON.stringify(doc)).toContain(GITHUB_OIDC_ISSUER);
    expect(JSON.stringify(doc)).toContain('repo:a/b:environment:prod');
  });

  it('lists every trusted sub claim in the trust policy', () => {
    const stack = new Stack(new App(), 'S');
    const principal = githubActionsPrincipal(
      'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com',
      { repo: 'a/b', subjects: [{ kind: 'pull_request' }, { kind: 'branch', branch: 'main' }] },
    );
    const role = new Role(stack, 'R', { assumedBy: principal });
    const serialized = JSON.stringify(role.assumeRolePolicy?.toJSON());
    expect(serialized).toContain('repo:a/b:pull_request');
    expect(serialized).toContain('repo:a/b:ref:refs/heads/main');
  });

  // An empty list synthesizes a role nothing can assume, and the failure only
  // shows up at deploy time as an opaque STS error on whichever workflow tries.
  it('refuses to build a principal that trusts nothing', () => {
    expect(() =>
      githubActionsPrincipal('arn:aws:iam::123456789012:oidc-provider/x', {
        repo: 'a/b',
        subjects: [],
      }),
    ).toThrow(/trusts nothing/);
  });
});
