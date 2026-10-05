import { App, Stack } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { describe, expect, it } from 'vitest';
import type { SubjectFormat } from '../../src/internal/oidc-subject.utils.js';
import { GITHUB_OIDC_ISSUER, githubActionsPrincipal } from '../../src/internal/oidc.js';

const NAME_FORMAT: SubjectFormat = { kind: 'name' };
const TALOS_IMMUTABLE_FORMAT: SubjectFormat = {
  kind: 'immutable',
  ownerId: 44852104,
  repositoryId: 1401805496,
};
const PROVIDER_ARN = 'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com';

// @FollowsBlueprint test-cdk-synth
describe('githubActionsPrincipal', () => {
  it('produces a FederatedPrincipal that synths a trust policy with the issuer + sub claim', () => {
    const stack = new Stack(new App(), 'S');
    const principal = githubActionsPrincipal(PROVIDER_ARN, {
      repo: 'a/b',
      subjectFormat: NAME_FORMAT,
      subjects: [{ kind: 'environment', environment: 'prod' }],
    });
    const role = new Role(stack, 'R', { assumedBy: principal });
    const doc = role.assumeRolePolicy?.toJSON();
    expect(JSON.stringify(doc)).toContain(GITHUB_OIDC_ISSUER);
    expect(JSON.stringify(doc)).toContain('repo:a/b:environment:prod');
  });

  it('lists every trusted sub claim in the trust policy', () => {
    const stack = new Stack(new App(), 'S');
    const principal = githubActionsPrincipal(PROVIDER_ARN, {
      repo: 'a/b',
      subjectFormat: NAME_FORMAT,
      subjects: [{ kind: 'pull_request' }, { kind: 'branch', branch: 'main' }],
    });
    const role = new Role(stack, 'R', { assumedBy: principal });
    const serialized = JSON.stringify(role.assumeRolePolicy?.toJSON());
    expect(serialized).toContain('repo:a/b:pull_request');
    expect(serialized).toContain('repo:a/b:ref:refs/heads/main');
  });

  it('trusts only the immutable claim for a repository on the immutable format', () => {
    const stack = new Stack(new App(), 'S');
    const principal = githubActionsPrincipal(PROVIDER_ARN, {
      repo: 'hugoleborso/talos',
      subjectFormat: TALOS_IMMUTABLE_FORMAT,
      subjects: [{ kind: 'environment', environment: 'prod' }],
    });
    const role = new Role(stack, 'R', { assumedBy: principal });
    const serialized = JSON.stringify(role.assumeRolePolicy?.toJSON());
    expect(serialized).toContain('repo:hugoleborso@44852104/talos@1401805496:environment:prod');
    expect(serialized).not.toContain('repo:hugoleborso/talos');
  });

  it('pins the audience and the action, and lists the sub claims under StringLike', () => {
    const principal = githubActionsPrincipal(PROVIDER_ARN, {
      repo: 'a/b',
      subjectFormat: NAME_FORMAT,
      subjects: [{ kind: 'pull_request' }],
    });
    expect(principal.assumeRoleAction).toBe('sts:AssumeRoleWithWebIdentity');
    expect(principal.conditions).toStrictEqual({
      StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
      StringLike: { 'token.actions.githubusercontent.com:sub': ['repo:a/b:pull_request'] },
    });
  });

  it('refuses to build a principal that trusts nothing', () => {
    expect(() =>
      githubActionsPrincipal('arn:aws:iam::123456789012:oidc-provider/x', {
        repo: 'a/b',
        subjectFormat: NAME_FORMAT,
        subjects: [],
      }),
    ).toThrow(/trusts nothing/);
  });
});
