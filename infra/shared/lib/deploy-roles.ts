import { githubActionsPrincipal } from '@borso/infra';
import { Duration } from 'aws-cdk-lib';
import { Effect, ManagedPolicy, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

const CONSUMER_REPO = 'hugoleborso/borso.fr';
const DEFAULT_BRANCH = 'main';
const PREVIEW_ROLE_MAX_SESSION_HOURS = 2;
const DEPLOY_ROLE_MAX_SESSION_HOURS = 1;
const RESOURCES_NOT_SCOPABLE_BY_ARN = ['*'];

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

const managedPolicyIamActions = [
  'iam:CreatePolicy',
  'iam:DeletePolicy',
  'iam:GetPolicy',
  'iam:GetPolicyVersion',
  'iam:CreatePolicyVersion',
  'iam:DeletePolicyVersion',
  'iam:ListPolicyVersions',
  'iam:TagPolicy',
  'iam:UntagPolicy',
];

const oidcProviderIamActions = [
  'iam:CreateOpenIDConnectProvider',
  'iam:DeleteOpenIDConnectProvider',
  'iam:GetOpenIDConnectProvider',
  'iam:UpdateOpenIDConnectProviderThumbprint',
  'iam:AddClientIDToOpenIDConnectProvider',
  'iam:RemoveClientIDFromOpenIDConnectProvider',
  'iam:TagOpenIDConnectProvider',
  'iam:UntagOpenIDConnectProvider',
  'iam:ListOpenIDConnectProviderTags',
];

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

function dsqlAppPolicy(): PolicyStatement {
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: dsqlAppActions,
    resources: RESOURCES_NOT_SCOPABLE_BY_ARN,
  });
}

function createProdDeployRole(scope: Construct, props: DeployRolesProps): Role {
  const prod = new Role(scope, 'ProdDeployRole', {
    roleName: 'ProdDeployRole',
    assumedBy: githubActionsPrincipal(props.oidcProviderArn, {
      repo: CONSUMER_REPO,
      subjects: [{ kind: 'environment', environment: 'prod' }],
    }),
    maxSessionDuration: Duration.hours(DEPLOY_ROLE_MAX_SESSION_HOURS),
    description:
      'Used by deploy.yml to deploy prod app stacks. The prod GitHub environment scopes this trust; the merge to main is the gate, not a reviewer rule.',
  });
  prod.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'));
  prod.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: cdkRoleIamActions,
      resources: [
        `arn:aws:iam::${props.account}:role/*-prod-*`,
        `arn:aws:iam::${props.account}:role/cdk-*`,
      ],
    }),
  );
  prod.addToPolicy(dsqlAppPolicy());
  return prod;
}

function createPreviewDeployRole(scope: Construct, props: DeployRolesProps): Role {
  const preview = new Role(scope, 'PreviewDeployRole', {
    roleName: 'PreviewDeployRole',
    assumedBy: githubActionsPrincipal(props.oidcProviderArn, {
      repo: CONSUMER_REPO,
      subjects: [{ kind: 'pull_request' }, { kind: 'branch', branch: DEFAULT_BRANCH }],
    }),
    maxSessionDuration: Duration.hours(PREVIEW_ROLE_MAX_SESSION_HOURS),
    description:
      'Used by preview.yml to deploy/destroy <app>-pr-<n> stacks, and by cleanup-orphans.yml on its schedule.',
  });
  preview.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'));
  preview.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: cdkRoleIamActions,
      resources: [
        `arn:aws:iam::${props.account}:role/*-pr-*`,
        `arn:aws:iam::${props.account}:role/cdk-*`,
      ],
    }),
  );
  preview.addToPolicy(dsqlAppPolicy());
  return preview;
}

function rolesAndPoliciesThisStackOwns(account: string): string[] {
  return [
    `arn:aws:iam::${account}:role/ProdDeployRole`,
    `arn:aws:iam::${account}:role/PreviewDeployRole`,
    `arn:aws:iam::${account}:role/SharedInfraDeployRole`,
    `arn:aws:iam::${account}:role/borso-shared-*`,
    `arn:aws:iam::${account}:role/cdk-*`,
    `arn:aws:iam::${account}:policy/*`,
  ];
}

function createSharedInfraDeployRole(scope: Construct, props: DeployRolesProps): Role {
  const shared = new Role(scope, 'SharedInfraDeployRole', {
    roleName: 'SharedInfraDeployRole',
    assumedBy: githubActionsPrincipal(props.oidcProviderArn, {
      repo: CONSUMER_REPO,
      subjects: [{ kind: 'environment', environment: 'prod-shared' }],
    }),
    maxSessionDuration: Duration.hours(DEPLOY_ROLE_MAX_SESSION_HOURS),
    description:
      'Self-deploy role for this stack. The prod-shared GitHub environment scopes this trust and carries no reviewer rule; shared-deploy.yml is dispatch-only, so the operator dispatching it is the gate.',
  });
  shared.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'));
  shared.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [...cdkRoleIamActions, ...managedPolicyIamActions],
      resources: rolesAndPoliciesThisStackOwns(props.account),
    }),
  );
  shared.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: oidcProviderIamActions,
      resources: [
        `arn:aws:iam::${props.account}:oidc-provider/token.actions.githubusercontent.com`,
      ],
    }),
  );
  shared.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['budgets:*'],
      resources: RESOURCES_NOT_SCOPABLE_BY_ARN,
    }),
  );
  return shared;
}

export function createDeployRoles(scope: Construct, props: DeployRolesProps): DeployRoles {
  return {
    prod: createProdDeployRole(scope, props),
    preview: createPreviewDeployRole(scope, props),
    shared: createSharedInfraDeployRole(scope, props),
  };
}
