/**
 * Helpers for building IAM trust policies pinned to a specific GitHub repo +
 * environment via the Actions OIDC provider.
 *
 * A role trusts a *set* of sub claims, not one, because the sub claim GitHub
 * mints depends on the event that started the workflow — not on the workflow
 * file. A job in a workflow that runs on both `pull_request` and `schedule`
 * presents `repo:<repo>:pull_request` in one case and
 * `repo:<repo>:ref:refs/heads/<default branch>` in the other. A role trusting
 * only the first authenticates on pull requests and fails on the schedule with
 * `Not authorized to perform sts:AssumeRoleWithWebIdentity`, which is what kept
 * cleanup-orphans red every night — see
 * docs/dantotsus/the-nightly-sweeper-never-had-permission-to-run.md and
 * docs/knowledge/github-oidc-sub-claim-per-trigger.md.
 *
 * @beta
 */

import { FederatedPrincipal } from 'aws-cdk-lib/aws-iam';

export const GITHUB_OIDC_ISSUER = 'token.actions.githubusercontent.com';

export type SubjectKind =
  | { readonly kind: 'environment'; readonly environment: string }
  | { readonly kind: 'pull_request' }
  | { readonly kind: 'branch'; readonly branch: string }
  | { readonly kind: 'any' };

export interface GithubSubject {
  /** Owner+repo, e.g. "hugoleborso/borso.fr". */
  readonly repo: string;
  /** Every sub claim this role accepts — one per trigger that assumes it. */
  readonly subjects: readonly SubjectKind[];
}

function subClaimFor(repo: string, subject: SubjectKind): string {
  switch (subject.kind) {
    case 'environment':
      return `repo:${repo}:environment:${subject.environment}`;
    case 'pull_request':
      return `repo:${repo}:pull_request`;
    case 'branch':
      return `repo:${repo}:ref:refs/heads/${subject.branch}`;
    case 'any':
      return `repo:${repo}:*`;
  }
}

export function githubSubClaims(subject: GithubSubject): string[] {
  return subject.subjects.map((kind) => subClaimFor(subject.repo, kind));
}

/**
 * Build a FederatedPrincipal that trusts GitHub Actions OIDC for the given
 * repo + sub claims. The OIDC provider must already exist in the account
 * (created by infra/shared/lib/shared-stack.ts).
 *
 * IAM evaluates a `StringLike` whose value is a list as "matches any entry",
 * so listing several subjects widens the trust to exactly those triggers and
 * no others.
 */
export function githubActionsPrincipal(
  oidcProviderArn: string,
  subject: GithubSubject,
): FederatedPrincipal {
  if (subject.subjects.length === 0) {
    throw new Error(
      `githubActionsPrincipal: no subjects for repo "${subject.repo}". A role with an empty subject list trusts nothing and every assume-role call against it fails.`,
    );
  }
  return new FederatedPrincipal(
    oidcProviderArn,
    {
      StringEquals: {
        [`${GITHUB_OIDC_ISSUER}:aud`]: 'sts.amazonaws.com',
      },
      StringLike: {
        [`${GITHUB_OIDC_ISSUER}:sub`]: githubSubClaims(subject),
      },
    },
    'sts:AssumeRoleWithWebIdentity',
  );
}
