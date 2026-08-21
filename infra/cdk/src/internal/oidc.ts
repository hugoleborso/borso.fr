import { FederatedPrincipal } from 'aws-cdk-lib/aws-iam';

export const GITHUB_OIDC_ISSUER = 'token.actions.githubusercontent.com';

export type SubjectKind =
  | { readonly kind: 'environment'; readonly environment: string }
  | { readonly kind: 'pull_request' }
  | { readonly kind: 'branch'; readonly branch: string }
  | { readonly kind: 'any' };

export interface GithubSubject {
  readonly repo: string;
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
