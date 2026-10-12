import { FederatedPrincipal } from 'aws-cdk-lib/aws-iam';
import { githubSubClaims, type GithubSubject } from './oidc-subject.utils.js';

export const GITHUB_OIDC_ISSUER = 'token.actions.githubusercontent.com';

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
