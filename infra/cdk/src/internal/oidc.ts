/**
 * Helpers for building IAM trust policies pinned to a specific GitHub repo +
 * environment via the Actions OIDC provider.
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
  readonly subject: SubjectKind;
}

export function githubSubClaim(subject: GithubSubject): string {
  const { repo } = subject;
  switch (subject.subject.kind) {
    case 'environment':
      return `repo:${repo}:environment:${subject.subject.environment}`;
    case 'pull_request':
      return `repo:${repo}:pull_request`;
    case 'branch':
      return `repo:${repo}:ref:refs/heads/${subject.subject.branch}`;
    case 'any':
      return `repo:${repo}:*`;
  }
}

/**
 * Build a FederatedPrincipal that trusts GitHub Actions OIDC for the given
 * repo + sub claim. The OIDC provider must already exist in the account
 * (created by infra/shared/lib/shared-stack.ts).
 */
export function githubActionsPrincipal(
  oidcProviderArn: string,
  subject: GithubSubject,
): FederatedPrincipal {
  return new FederatedPrincipal(
    oidcProviderArn,
    {
      StringEquals: {
        [`${GITHUB_OIDC_ISSUER}:aud`]: 'sts.amazonaws.com',
      },
      StringLike: {
        [`${GITHUB_OIDC_ISSUER}:sub`]: githubSubClaim(subject),
      },
    },
    'sts:AssumeRoleWithWebIdentity',
  );
}
