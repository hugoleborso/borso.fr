import { HOST_ROUTING_FUNCTION_CODE, githubActionsPrincipal } from '@borso/infra';
import { CfnResource, Duration, Fn, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { CfnBudget } from 'aws-cdk-lib/aws-budgets';
import type { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  Distribution,
  Function as CfFunction,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HttpVersion,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  Effect,
  ManagedPolicy,
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
} from 'aws-cdk-lib/aws-iam';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import { HOSTED_ZONE_NAME } from './certs-stack.js';

/** Single source of truth: the consumer repo every deploy role trusts. */
const CONSUMER_REPO = 'hugoleborso/borso.fr';
const PREVIEWS_DOMAIN = `*.preview.${HOSTED_ZONE_NAME}`;

interface SharedStackProps extends StackProps {
  readonly borsoFrCert: ICertificate;
  readonly previewCert: ICertificate;
  /** Email for budget alerts; defaults to the BORSO_BUDGET_EMAIL env var. */
  readonly budgetEmail?: string;
}

/**
 * Singleton account-level resources. Deployed once (and updated rarely) by
 * Hugo from a local checkout via `pnpm --filter @borso/shared-infra deploy`,
 * or from CI via the SharedInfraDeployRole + the `prod-shared` GitHub
 * environment.
 *
 * Owns:
 *   - GitHub OIDC provider (one per account)
 *   - DSQL cluster (one per account, multi-tenant via schemas)
 *   - Previews S3 bucket + CloudFront distribution + host-routing Function
 *   - Three deploy roles (prod / preview / shared-infra) — IAM trust pinned
 *     to repo:hugoleborso/borso.fr at the relevant subject claim
 *   - Cost budgets (€5/€20/€50, opt-in via budgetEmail/BORSO_BUDGET_EMAIL)
 *   - SSM parameters under /borso/shared/ that constructs read at synth
 *     time
 *
 * Dropped vs upstream borso-platform:
 *   - IntegTestRole: there is no integ workflow in the monorepo; preview
 *     deploys cover what integ used to cover.
 */
export class SharedStack extends Stack {
  constructor(scope: Construct, id: string, props: SharedStackProps) {
    super(scope, id, props);

    const zone = HostedZone.fromLookup(this, 'Zone', {
      domainName: HOSTED_ZONE_NAME,
    });

    const oidcProvider = new OpenIdConnectProvider(this, 'GithubOidc', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    const previewsBucket = new Bucket(this, 'PreviewsBucket', {
      bucketName: `borso-previews-${this.account}-${this.region}`,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'expire-previews',
          prefix: '',
          expiration: Duration.days(60),
        },
      ],
    });

    const routingFn = new CfFunction(this, 'HostRouter', {
      code: FunctionCode.fromInline(HOST_ROUTING_FUNCTION_CODE),
      runtime: FunctionRuntime.JS_2_0,
      comment: 'Maps preview hostnames to S3 prefixes',
    });

    const previewsDistribution = new Distribution(this, 'PreviewsDistribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(previewsBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        functionAssociations: [
          {
            function: routingFn,
            eventType: FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      domainNames: [PREVIEWS_DOMAIN],
      certificate: props.previewCert,
      httpVersion: HttpVersion.HTTP2_AND_3,
      priceClass: PriceClass.PRICE_CLASS_100,
    });

    const dsqlCluster = new CfnResource(this, 'DsqlCluster', {
      type: 'AWS::DSQL::Cluster',
      properties: {
        DeletionProtectionEnabled: true,
        Tags: [
          { Key: 'Project', Value: 'borso' },
          { Key: 'ManagedBy', Value: 'cdk' },
        ],
      },
    });
    const dsqlClusterId = dsqlCluster.ref;
    const dsqlClusterArn = Fn.sub(
      // biome-ignore lint/suspicious/noTemplateCurlyInString: CFN intrinsic, not JS template
      'arn:aws:dsql:${AWS::Region}:${AWS::AccountId}:cluster/${ClusterId}',
      { ClusterId: dsqlClusterId },
    );
    const dsqlEndpoint = Fn.sub(
      // biome-ignore lint/suspicious/noTemplateCurlyInString: CFN intrinsic, not JS template
      '${ClusterId}.dsql.${AWS::Region}.on.aws',
      { ClusterId: dsqlClusterId },
    );

    // === Deploy roles ===
    //
    // No role gets AdministratorAccess. PowerUserAccess + narrow IAM/DSQL/budgets/
    // OIDC additions cover what CDK actually does for each scope.
    //
    // ProdDeployRole         trusts repo:…:environment:prod
    //                        PowerUserAccess + iam:* on *-prod-* + cdk-* + DSQL connect
    // PreviewDeployRole      trusts repo:…:pull_request
    //                        PowerUserAccess + iam:* on *-pr-* + cdk-* + DSQL connect
    // SharedInfraDeployRole  trusts repo:…:environment:prod-shared
    //                        PowerUserAccess + iam:* on the deploy roles + cdk-* +
    //                        borso-shared-* + OIDC provider lifecycle + DSQL cluster
    //                        lifecycle + budgets:*

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
    const dsqlConnect = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['dsql:DbConnect', 'dsql:DbConnectAdmin'],
      resources: [dsqlClusterArn],
    });

    const prodDeployRole = new Role(this, 'ProdDeployRole', {
      roleName: 'ProdDeployRole',
      assumedBy: githubActionsPrincipal(oidcProvider.openIdConnectProviderArn, {
        repo: CONSUMER_REPO,
        subject: { kind: 'environment', environment: 'prod' },
      }),
      maxSessionDuration: Duration.hours(1),
      description: 'Used by deploy.yml to deploy prod app stacks. Gated by GitHub prod environment.',
    });
    prodDeployRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'));
    prodDeployRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: cdkRoleIamActions,
        resources: [
          `arn:aws:iam::${this.account}:role/*-prod-*`,
          `arn:aws:iam::${this.account}:role/cdk-*`,
        ],
      }),
    );
    prodDeployRole.addToPolicy(dsqlConnect);

    const previewDeployRole = new Role(this, 'PreviewDeployRole', {
      roleName: 'PreviewDeployRole',
      assumedBy: githubActionsPrincipal(oidcProvider.openIdConnectProviderArn, {
        repo: CONSUMER_REPO,
        subject: { kind: 'pull_request' },
      }),
      maxSessionDuration: Duration.hours(2),
      description: 'Used by preview.yml to deploy/destroy <app>-pr-<n> stacks.',
    });
    previewDeployRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'));
    previewDeployRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: cdkRoleIamActions,
        resources: [
          `arn:aws:iam::${this.account}:role/*-pr-*`,
          `arn:aws:iam::${this.account}:role/cdk-*`,
        ],
      }),
    );
    previewDeployRole.addToPolicy(dsqlConnect);

    const sharedDeployRole = new Role(this, 'SharedInfraDeployRole', {
      roleName: 'SharedInfraDeployRole',
      assumedBy: githubActionsPrincipal(oidcProvider.openIdConnectProviderArn, {
        repo: CONSUMER_REPO,
        subject: { kind: 'environment', environment: 'prod-shared' },
      }),
      maxSessionDuration: Duration.hours(1),
      description: 'Self-deploy role for this stack. Gated by GitHub prod-shared environment.',
    });
    sharedDeployRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'));
    // IAM role/policy lifecycle on the resources this stack owns:
    //   - the three named deploy roles themselves
    //   - CDK-managed roles created within this stack (borso-shared-*)
    //   - CDK bootstrap roles (cdk-*)
    //   - any managed policies created by the stack
    sharedDeployRole.addToPolicy(
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
          `arn:aws:iam::${this.account}:role/ProdDeployRole`,
          `arn:aws:iam::${this.account}:role/PreviewDeployRole`,
          `arn:aws:iam::${this.account}:role/SharedInfraDeployRole`,
          `arn:aws:iam::${this.account}:role/borso-shared-*`,
          `arn:aws:iam::${this.account}:role/cdk-*`,
          `arn:aws:iam::${this.account}:policy/*`,
        ],
      }),
    );
    // OIDC provider for GitHub Actions (one per account).
    sharedDeployRole.addToPolicy(
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
        resources: [
          `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`,
        ],
      }),
    );
    // DSQL cluster lifecycle (full because the shared stack owns the cluster).
    sharedDeployRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['dsql:*'],
        resources: ['*'],
      }),
    );
    // Budgets does not support resource-level scoping.
    sharedDeployRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['budgets:*'],
        resources: ['*'],
      }),
    );

    // === Budgets (mandatory) ===

    const budgetEmail = props.budgetEmail ?? process.env.BORSO_BUDGET_EMAIL;
    if (!budgetEmail) {
      throw new Error(
        'SharedStack: budget email is mandatory. Set BORSO_BUDGET_EMAIL env var or pass props.budgetEmail. ' +
          'Three monthly cost alarms (€5/€20/€50) will fire to this address at 80% of each threshold.',
      );
    }
    for (const amount of [5, 20, 50]) {
      new CfnBudget(this, `Budget${amount}`, {
        budget: {
          budgetName: `borso-monthly-${amount}eur`,
          budgetType: 'COST',
          timeUnit: 'MONTHLY',
          budgetLimit: { amount, unit: 'EUR' },
        },
        notificationsWithSubscribers: [
          {
            notification: {
              notificationType: 'ACTUAL',
              comparisonOperator: 'GREATER_THAN',
              threshold: 80,
              thresholdType: 'PERCENTAGE',
            },
            subscribers: [{ subscriptionType: 'EMAIL', address: budgetEmail }],
          },
        ],
      });
    }

    // === SSM parameters (consumed by constructs at synth time) ===

    new StringParameter(this, 'OidcArnParam', {
      parameterName: '/borso/shared/oidc-provider-arn',
      stringValue: oidcProvider.openIdConnectProviderArn,
    });
    new StringParameter(this, 'HostedZoneIdParam', {
      parameterName: '/borso/shared/hosted-zone-id',
      stringValue: zone.hostedZoneId,
    });
    new StringParameter(this, 'HostedZoneNameParam', {
      parameterName: '/borso/shared/hosted-zone-name',
      stringValue: HOSTED_ZONE_NAME,
    });
    new StringParameter(this, 'CertBorsoFrParam', {
      parameterName: '/borso/shared/cert-borso-fr-arn',
      stringValue: props.borsoFrCert.certificateArn,
    });
    new StringParameter(this, 'CertPreviewParam', {
      parameterName: '/borso/shared/cert-preview-borso-fr-arn',
      stringValue: props.previewCert.certificateArn,
    });
    new StringParameter(this, 'PreviewsBucketParam', {
      parameterName: '/borso/shared/previews-bucket-name',
      stringValue: previewsBucket.bucketName,
    });
    new StringParameter(this, 'PreviewsDistributionIdParam', {
      parameterName: '/borso/shared/previews-distribution-id',
      stringValue: previewsDistribution.distributionId,
    });
    new StringParameter(this, 'DsqlArnParam', {
      parameterName: '/borso/shared/dsql-cluster-arn',
      stringValue: dsqlClusterArn,
    });
    new StringParameter(this, 'DsqlEndpointParam', {
      parameterName: '/borso/shared/dsql-cluster-endpoint',
      stringValue: dsqlEndpoint,
    });
    new StringParameter(this, 'ProdDeployRoleArnParam', {
      parameterName: '/borso/shared/prod-deploy-role-arn',
      stringValue: prodDeployRole.roleArn,
    });
    new StringParameter(this, 'PreviewDeployRoleArnParam', {
      parameterName: '/borso/shared/preview-deploy-role-arn',
      stringValue: previewDeployRole.roleArn,
    });
    new StringParameter(this, 'SharedDeployRoleArnParam', {
      parameterName: '/borso/shared/shared-deploy-role-arn',
      stringValue: sharedDeployRole.roleArn,
    });
  }
}
