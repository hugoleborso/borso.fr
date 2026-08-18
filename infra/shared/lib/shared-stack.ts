import { HOST_ROUTING_FUNCTION_CODE, SHARED_SSM_PARAMETERS } from '@borso/infra';
import { Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { CfnBudget } from 'aws-cdk-lib/aws-budgets';
import {
  Certificate,
  CertificateValidation,
  type ICertificate,
} from 'aws-cdk-lib/aws-certificatemanager';
import {
  Function as CfFunction,
  Distribution,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HttpVersion,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { OpenIdConnectProvider, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AaaaRecord, ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import { HOSTED_ZONE_NAME } from './certs-stack.js';
import { createDeployRoles } from './deploy-roles.js';

const PREVIEWS_DOMAIN = `*.preview.${HOSTED_ZONE_NAME}`;

interface SharedStackProps extends StackProps {
  readonly borsoFrCert: ICertificate;
  readonly previewCert: ICertificate;
  /** Address the three cost alarms notify. Read from the environment by `bin/shared.ts`. */
  readonly budgetEmail: string;
}

/**
 * Singleton account-level resources. Deployed once (and updated rarely) by
 * Hugo from a local checkout via `pnpm --filter @borso/shared-infra deploy`,
 * or from CI via the SharedInfraDeployRole + the `prod-shared` GitHub
 * environment.
 *
 * Owns:
 *   - GitHub OIDC provider (one per account)
 *   - Previews S3 bucket + CloudFront distribution + host-routing Function
 *   - Three deploy roles (prod / preview / shared-infra) — see deploy-roles.ts
 *   - Cost budgets ($2/$5/$20/$50), notifying `props.budgetEmail`
 *   - The SSM parameters listed in `SHARED_SSM_PARAMETERS`, which constructs
 *     read at synth time
 *
 * Does NOT own (anymore):
 *   - DSQL cluster — moved to per-app `DsqlCluster` (lives with the app's
 *     prod stack, shared across stages of the same app via SSM lookup).
 *   - IntegTestRole — there is no integ workflow in the monorepo; preview
 *     deploys cover what integ used to cover.
 *
 * @Blueprint shared-account-stack
 * @BlueprintName Shared Account Stack
 * @BlueprintUsage Use for a resource that exists once per AWS account and that other stacks need to find.
 * @BlueprintDescription Creates the account-wide singletons in one `Stack` subclass and publishes every value a downstream stack needs as an SSM parameter under one prefix, so an app construct reads a path at synth time instead of taking a cross-stack export or a hard-coded ARN. Every environment-derived value arrives as a prop from `bin/shared.ts`, so the stack itself never reads `process.env`.
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
      bucketName: 'borso-previews',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [{ id: 'expire-previews', prefix: '', expiration: Duration.days(60) }],
    });

    const routingFunction = new CfFunction(this, 'HostRouter', {
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
          { function: routingFunction, eventType: FunctionEventType.VIEWER_REQUEST },
        ],
      },
      domainNames: [PREVIEWS_DOMAIN],
      certificate: props.previewCert,
      httpVersion: HttpVersion.HTTP2_AND_3,
      priceClass: PriceClass.PRICE_CLASS_100,
      errorResponses: [
        // S3 returns 404 for missing keys (now that we grant ListBucket
        // below). Serve a fallback /404.jpeg from the bucket root, shared
        // across every preview subdomain. Hugo uploads the file once
        // post-deploy; if it isn't there, CloudFront falls back to its
        // default error page after a short loop.
        { httpStatus: 404, responsePagePath: '/404.jpeg', ttl: Duration.minutes(5) },
      ],
    });

    // Grant the CloudFront OAC principal s3:ListBucket so S3 can return 404
    // (instead of 403) for missing keys. Without this, broken preview links
    // surface as "Access Denied" and the 404 errorResponses entry above
    // never fires. Mirrors the per-app prod equivalent in StaticSite.
    previewsBucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ['s3:ListBucket'],
        principals: [new ServicePrincipal('cloudfront.amazonaws.com')],
        resources: [previewsBucket.bucketArn],
        conditions: {
          StringEquals: { 'aws:SourceArn': previewsDistribution.distributionArn },
        },
      }),
    );

    // Wildcard DNS into the previews distribution. Without this, every
    // <app>-pr-<n>.preview.borso.fr resolves to NXDOMAIN even though the
    // distribution and cert are provisioned.
    const previewsAliasTarget = RecordTarget.fromAlias(new CloudFrontTarget(previewsDistribution));
    new ARecord(this, 'PreviewsAliasA', {
      zone,
      recordName: '*.preview',
      target: previewsAliasTarget,
    });
    new AaaaRecord(this, 'PreviewsAliasAAAA', {
      zone,
      recordName: '*.preview',
      target: previewsAliasTarget,
    });

    // Regional (eu-west-3) twin of the us-east-1 CloudFront cert. Needed
    // for API Gateway HTTP API custom domains, which only accept certs
    // from the same region as the API. Same wildcard, different region —
    // API Gateway then serves preview-API hostnames like
    // `<app>-pr-<n>-api.preview.borso.fr` under it.
    const previewsRegionalCert = new Certificate(this, 'PreviewsRegionalCert', {
      domainName: PREVIEWS_DOMAIN,
      validation: CertificateValidation.fromDns(zone),
    });

    const deployRoles = createDeployRoles(this, {
      oidcProviderArn: oidcProvider.openIdConnectProviderArn,
      account: this.account,
    });

    // === Budgets (mandatory) ===

    // AWS Budgets only accepts USD as the currency unit. The amounts below
    // are dollar thresholds — close enough to euro at the tiny absolute scale
    // we operate at, and AWS rejects any other Unit value at deploy time.
    for (const amount of [2, 5, 20, 50]) {
      new CfnBudget(this, `Budget${amount}`, {
        budget: {
          budgetName: `borso-monthly-${amount}usd`,
          budgetType: 'COST',
          timeUnit: 'MONTHLY',
          budgetLimit: { amount, unit: 'USD' },
        },
        notificationsWithSubscribers: [
          {
            notification: {
              notificationType: 'ACTUAL',
              comparisonOperator: 'GREATER_THAN',
              threshold: 80,
              thresholdType: 'PERCENTAGE',
            },
            subscribers: [{ subscriptionType: 'EMAIL', address: props.budgetEmail }],
          },
        ],
      });
    }

    // === SSM parameters (consumed by constructs at synth time) ===

    new StringParameter(this, 'OidcArnParam', {
      parameterName: SHARED_SSM_PARAMETERS.oidcProviderArn,
      stringValue: oidcProvider.openIdConnectProviderArn,
    });
    new StringParameter(this, 'HostedZoneIdParam', {
      parameterName: SHARED_SSM_PARAMETERS.hostedZoneId,
      stringValue: zone.hostedZoneId,
    });
    new StringParameter(this, 'HostedZoneNameParam', {
      parameterName: SHARED_SSM_PARAMETERS.hostedZoneName,
      stringValue: HOSTED_ZONE_NAME,
    });
    new StringParameter(this, 'CertBorsoFrParam', {
      parameterName: SHARED_SSM_PARAMETERS.certBorsoFrArn,
      stringValue: props.borsoFrCert.certificateArn,
    });
    new StringParameter(this, 'CertPreviewParam', {
      parameterName: SHARED_SSM_PARAMETERS.certPreviewArn,
      stringValue: props.previewCert.certificateArn,
    });
    new StringParameter(this, 'CertPreviewRegionalParam', {
      parameterName: SHARED_SSM_PARAMETERS.certPreviewRegionalArn,
      stringValue: previewsRegionalCert.certificateArn,
    });
    new StringParameter(this, 'PreviewsBucketParam', {
      parameterName: SHARED_SSM_PARAMETERS.previewsBucketName,
      stringValue: previewsBucket.bucketName,
    });
    new StringParameter(this, 'PreviewsDistributionIdParam', {
      parameterName: SHARED_SSM_PARAMETERS.previewsDistributionId,
      stringValue: previewsDistribution.distributionId,
    });
    new StringParameter(this, 'PreviewsDistributionDomainParam', {
      parameterName: SHARED_SSM_PARAMETERS.previewsDistributionDomain,
      stringValue: previewsDistribution.distributionDomainName,
    });
    new StringParameter(this, 'ProdDeployRoleArnParam', {
      parameterName: SHARED_SSM_PARAMETERS.prodDeployRoleArn,
      stringValue: deployRoles.prod.roleArn,
    });
    new StringParameter(this, 'PreviewDeployRoleArnParam', {
      parameterName: SHARED_SSM_PARAMETERS.previewDeployRoleArn,
      stringValue: deployRoles.preview.roleArn,
    });
    new StringParameter(this, 'SharedDeployRoleArnParam', {
      parameterName: SHARED_SSM_PARAMETERS.sharedDeployRoleArn,
      stringValue: deployRoles.shared.roleArn,
    });
  }
}
