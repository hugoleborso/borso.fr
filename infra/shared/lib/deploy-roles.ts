import { githubActionsPrincipal } from '@borso/infra';
import { Duration } from 'aws-cdk-lib';
import { Effect, ManagedPolicy, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

/** Single source of truth: the consumer repo every deploy role trusts. */
const CONSUMER_REPO = 'hugoleborso/borso.fr';

/**
 * The branch a `schedule` or `workflow_dispatch` run reports as its ref, and
 * therefore the branch name that ends up in the OIDC sub claim for those events.
 */
const DEFAULT_BRANCH = 'main';

/**
 * IAM actions a CDK-driven deploy needs on the per-stack roles it creates,
 * updates, tags, and deletes. Shared between PreviewDeployRole and
 * ProdDeployRole (which scope these to different role-name patterns) and
 * SharedInfraDeployRole (which adds policy management on top).
 */
const cdkRoleIamActions = [
  'iam:CreateRole',
  'iam:DeleteRole',
  'iam:GetRole',
  'iam:GetRolePolicy',
  'iam:UpdateRole',
  'iam:UpdateRoleDescription',
  'iam:UpdateAssumeRolePolicy',
  'iam:AttachRolePolicy',
  'iam:DetachRolePolicy',
  'iam:ListAttachedRolePolicies',
  'iam:PutRolePolicy',
  'iam:DeleteRolePolicy',
  'iam:ListRolePolicies',
  'iam:TagRole',
  'iam:UntagRole',
  'iam:ListRoleTags',
  'iam:PassRole',
];

/**
 * DSQL actions an app deploy needs: cluster lifecycle (prod stack creates
 * one per app, preview/integ stacks share it via SSM lookup) plus connect.
 * The cluster ARN isn't predictable at policy-creation time (DSQL assigns
 * IDs), so resources are `*`. Tag-based scoping could narrow this later
 * via `aws:ResourceTag/Project: borso` if it becomes worth doing.
 */
const dsqlAppActions = [
  'dsql:CreateCluster',
  'dsql:DeleteCluster',
  'dsql:GetCluster',
  'dsql:UpdateCluster',
  'dsql:ListClusters',
  'dsql:TagResource',
  'dsql:UntagResource',
  'dsql:ListTagsForResource',
  'dsql:DbConnect',
  'dsql:DbConnectAdmin',
];

interface DeployRoles {
  readonly prod: Role;
  readonly preview: Role;
  readonly shared: Role;
}

interface DeployRolesProps {
  readonly oidcProviderArn: string;
  readonly account: string;
}

/**
 * Creates the three GitHub Actions deploy roles owned by the shared stack.
 * No role gets AdministratorAccess — PowerUserAccess + scoped IAM/DSQL
 * (and on the shared role, OIDC provider lifecycle + budgets:*) covers what
 * CDK actually does at each scope.
 */
export function createDeployRoles(scope: Construct, props: DeployRolesProps): DeployRoles {
  const { oidcProviderArn, account } = props;

  const dsqlAppPolicy = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: dsqlAppActions,
    resources: ['*'],
  });

  // --- ProdDeployRole — trusts repo:…:environment:prod ---

  const prod = new Role(scope, 'ProdDeployRole', {
    roleName: 'ProdDeployRole',
    assumedBy: githubActionsPrincipal(oidcProviderArn, {
      repo: CONSUMER_REPO,
      subjects: [{ kind: 'environment', environment: 'prod' }],
    }),
    maxSessionDuration: Duration.hours(1),
    description:
      'Used by deploy.yml to deploy prod app stacks. The prod GitHub environment scopes this trust; the merge to main is the gate, not a reviewer rule.',
  });
  prod.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'));
  prod.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: cdkRoleIamActions,
      resources: [`arn:aws:iam::${account}:role/*-prod-*`, `arn:aws:iam::${account}:role/cdk-*`],
    }),
  );
  prod.addToPolicy(dsqlAppPolicy);

  // --- PreviewDeployRole — trusts repo:…:pull_request AND the default branch ---
  //
  // preview.yml assumes this on `pull_request`, and cleanup-orphans.yml assumes
  // it on `pull_request`, `schedule` AND `workflow_dispatch`. The last two mint
  // a `ref:refs/heads/main` sub, not a `pull_request` one, so a trust policy
  // naming only `pull_request` left the nightly sweep unable to authenticate
  // from the day it was written.

  const preview = new Role(scope, 'PreviewDeployRole', {
    roleName: 'PreviewDeployRole',
    assumedBy: githubActionsPrincipal(oidcProviderArn, {
      repo: CONSUMER_REPO,
      subjects: [{ kind: 'pull_request' }, { kind: 'branch', branch: DEFAULT_BRANCH }],
    }),
    maxSessionDuration: Duration.hours(2),
    description:
      'Used by preview.yml to deploy/destroy <app>-pr-<n> stacks, and by cleanup-orphans.yml on its schedule.',
  });
  preview.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'));
  preview.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: cdkRoleIamActions,
      resources: [`arn:aws:iam::${account}:role/*-pr-*`, `arn:aws:iam::${account}:role/cdk-*`],
    }),
  );
  preview.addToPolicy(dsqlAppPolicy);

  // --- SharedInfraDeployRole — trusts repo:…:environment:prod-shared ---

  const shared = new Role(scope, 'SharedInfraDeployRole', {
    roleName: 'SharedInfraDeployRole',
    assumedBy: githubActionsPrincipal(oidcProviderArn, {
      repo: CONSUMER_REPO,
      subjects: [{ kind: 'environment', environment: 'prod-shared' }],
    }),
    maxSessionDuration: Duration.hours(1),
    description:
      'Self-deploy role for this stack. The prod-shared GitHub environment scopes this trust; the gate is shared-deploy.yml’s typed confirmation, not a reviewer rule.',
  });
  shared.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'));
  // IAM role/policy lifecycle on the resources this stack owns:
  //   - the three named deploy roles themselves
  //   - CDK-managed roles created within this stack (borso-shared-*)
  //   - CDK bootstrap roles (cdk-*)
  //   - any managed policies created by the stack
  shared.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        ...cdkRoleIamActions,
        'iam:CreatePolicy',
        'iam:DeletePolicy',
        'iam:GetPolicy',
        'iam:GetPolicyVersion',
        'iam:CreatePolicyVersion',
        'iam:DeletePolicyVersion',
        'iam:ListPolicyVersions',
        'iam:TagPolicy',
        'iam:UntagPolicy',
      ],
      resources: [
        `arn:aws:iam::${account}:role/ProdDeployRole`,
        `arn:aws:iam::${account}:role/PreviewDeployRole`,
        `arn:aws:iam::${account}:role/SharedInfraDeployRole`,
        `arn:aws:iam::${account}:role/borso-shared-*`,
        `arn:aws:iam::${account}:role/cdk-*`,
        `arn:aws:iam::${account}:policy/*`,
      ],
    }),
  );
  // OIDC provider for GitHub Actions (one per account).
  shared.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'iam:CreateOpenIDConnectProvider',
        'iam:DeleteOpenIDConnectProvider',
        'iam:GetOpenIDConnectProvider',
        'iam:UpdateOpenIDConnectProviderThumbprint',
        'iam:AddClientIDToOpenIDConnectProvider',
        'iam:RemoveClientIDFromOpenIDConnectProvider',
        'iam:TagOpenIDConnectProvider',
        'iam:UntagOpenIDConnectProvider',
        'iam:ListOpenIDConnectProviderTags',
      ],
      resources: [`arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com`],
    }),
  );
  // Budgets does not support resource-level scoping.
  shared.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['budgets:*'],
      resources: ['*'],
    }),
  );

  return { prod, preview, shared };
}
