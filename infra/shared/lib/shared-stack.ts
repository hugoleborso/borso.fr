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
const PREVIEW_OBJECT_EXPIRATION_DAYS = 60;
const ERROR_RESPONSE_TTL_MINUTES = 5;
const MONTHLY_BUDGET_FIRST_ALERT_USD = 2;
const MONTHLY_BUDGET_SECOND_ALERT_USD = 5;
const MONTHLY_BUDGET_THIRD_ALERT_USD = 20;
const MONTHLY_BUDGET_FINAL_ALERT_USD = 50;
const MONTHLY_BUDGET_AMOUNTS_USD = [
  MONTHLY_BUDGET_FIRST_ALERT_USD,
  MONTHLY_BUDGET_SECOND_ALERT_USD,
  MONTHLY_BUDGET_THIRD_ALERT_USD,
  MONTHLY_BUDGET_FINAL_ALERT_USD,
];
const BUDGET_ALERT_THRESHOLD_PERCENT = 80;
const PREVIEWS_WILDCARD_RECORD_NAME = '*.preview';

interface SharedStackProps extends StackProps {
  readonly borsoFrCert: ICertificate;
  readonly previewCert: ICertificate;
  readonly budgetEmail: string;
}

/**
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
      lifecycleRules: [
        {
          id: 'expire-previews',
          prefix: '',
          expiration: Duration.days(PREVIEW_OBJECT_EXPIRATION_DAYS),
        },
      ],
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
        {
          httpStatus: 404,
          responsePagePath: '/404.jpeg',
          ttl: Duration.minutes(ERROR_RESPONSE_TTL_MINUTES),
        },
      ],
    });

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

    const previewsAliasTarget = RecordTarget.fromAlias(new CloudFrontTarget(previewsDistribution));
    new ARecord(this, 'PreviewsAliasA', {
      zone,
      recordName: PREVIEWS_WILDCARD_RECORD_NAME,
      target: previewsAliasTarget,
    });
    new AaaaRecord(this, 'PreviewsAliasAAAA', {
      zone,
      recordName: PREVIEWS_WILDCARD_RECORD_NAME,
      target: previewsAliasTarget,
    });

    const previewsRegionalCert = new Certificate(this, 'PreviewsRegionalCert', {
      domainName: PREVIEWS_DOMAIN,
      validation: CertificateValidation.fromDns(zone),
    });

    const deployRoles = createDeployRoles(this, {
      oidcProviderArn: oidcProvider.openIdConnectProviderArn,
      account: this.account,
    });

    this.createMonthlyBudgets(props.budgetEmail);

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

  private createMonthlyBudgets(budgetEmail: string): void {
    for (const amount of MONTHLY_BUDGET_AMOUNTS_USD) {
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
              threshold: BUDGET_ALERT_THRESHOLD_PERCENT,
              thresholdType: 'PERCENTAGE',
            },
            subscribers: [{ subscriptionType: 'EMAIL', address: budgetEmail }],
          },
        ],
      });
    }
  }
}
