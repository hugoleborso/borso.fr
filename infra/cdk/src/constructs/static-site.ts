import * as path from 'node:path';
import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachePolicy,
  Function as CloudFrontFunction,
  Distribution,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HttpVersion,
  OriginRequestPolicy,
  PriceClass,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AaaaRecord, ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE } from '../internal/cf-static-site-index-rewrite.js';
import {
  assertDeployStage,
  bucketName,
  isProductionStage,
  previewHostname,
  previewS3Prefix,
  type Stage,
  validateAppSlug,
} from '../internal/naming.utils.js';
import { SHARED_SSM_PARAMETERS } from '../internal/shared-ssm.js';
import { applyStandardTags } from '../internal/tags.js';

const ERROR_RESPONSE_TTL_MINUTES = 5;
const BUCKET_DEPLOYMENT_MEMORY_MIB = 512;
const FULLY_QUALIFIED_DOMAIN_SUFFIX = '.';
const DEFAULT_API_PATH_PATTERN = '/api/*';

export interface StaticSiteProps {
  readonly app: string;
  readonly stage: Stage;
  readonly domainName?: string;
  readonly prNumber?: number;
  readonly assetsPath: string;
  readonly api?: {
    readonly domainName: string;
    readonly pathPattern?: string;
  };
  readonly spaFallback?: boolean;
}

// @FollowsBlueprint reusable-cdk-construct
export class StaticSite extends Construct {
  public readonly url: string;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    applyStandardTags(this, props);

    const isProduction = isProductionStage(props.stage);
    this.url = isProduction ? this.buildProd(props) : this.buildPreview(props);

    new CfnOutput(this, 'Url', { value: this.url });
  }

  private buildProd(props: StaticSiteProps): string {
    if (!props.domainName) {
      throw new Error('StaticSite: domainName is required for stage="prod".');
    }
    const bucket = new Bucket(this, 'Bucket', {
      bucketName: bucketName(props),
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const certArn = StringParameter.valueForStringParameter(
      this,
      SHARED_SSM_PARAMETERS.certBorsoFrArn,
    );
    const cert = Certificate.fromCertificateArn(this, 'Cert', certArn);

    const indexRewriteFunction = new CloudFrontFunction(this, 'IndexRewriteFunction', {
      runtime: FunctionRuntime.JS_2_0,
      code: FunctionCode.fromInline(STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE),
      comment: 'Rewrite directory-style URIs to /<dir>/index.html',
    });

    const distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
        functionAssociations: [
          {
            function: indexRewriteFunction,
            eventType: FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      defaultRootObject: 'index.html',
      domainNames: [props.domainName],
      certificate: cert,
      httpVersion: HttpVersion.HTTP2_AND_3,
      priceClass: PriceClass.PRICE_CLASS_100,
      errorResponses: props.spaFallback
        ? [
            {
              httpStatus: 404,
              responsePagePath: '/index.html',
              responseHttpStatus: 200,
              ttl: Duration.minutes(ERROR_RESPONSE_TTL_MINUTES),
            },
          ]
        : [
            {
              httpStatus: 404,
              responsePagePath: '/404.jpeg',
              ttl: Duration.minutes(ERROR_RESPONSE_TTL_MINUTES),
            },
          ],
    });

    if (props.api) {
      distribution.addBehavior(
        props.api.pathPattern ?? DEFAULT_API_PATH_PATTERN,
        new HttpOrigin(props.api.domainName),
        {
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      );
    }

    bucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ['s3:ListBucket'],
        principals: [new ServicePrincipal('cloudfront.amazonaws.com')],
        resources: [bucket.bucketArn],
        conditions: {
          StringEquals: { 'aws:SourceArn': distribution.distributionArn },
        },
      }),
    );

    new BucketDeployment(this, 'Deploy', {
      sources: [Source.asset(path.resolve(props.assetsPath))],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
      memoryLimit: BUCKET_DEPLOYMENT_MEMORY_MIB,
    });

    const zoneName = StringParameter.valueForStringParameter(
      this,
      SHARED_SSM_PARAMETERS.hostedZoneName,
    );
    const zoneId = StringParameter.valueForStringParameter(
      this,
      SHARED_SSM_PARAMETERS.hostedZoneId,
    );
    const zone = HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: zoneId,
      zoneName,
    });
    const fullyQualifiedDomainName = props.domainName.endsWith(FULLY_QUALIFIED_DOMAIN_SUFFIX)
      ? props.domainName
      : `${props.domainName}${FULLY_QUALIFIED_DOMAIN_SUFFIX}`;
    new ARecord(this, 'AliasA', {
      zone,
      recordName: fullyQualifiedDomainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
    new AaaaRecord(this, 'AliasAAAA', {
      zone,
      recordName: fullyQualifiedDomainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    return `https://${props.domainName}`;
  }

  private buildPreview(props: StaticSiteProps): string {
    const sharedBucketName = StringParameter.valueForStringParameter(
      this,
      SHARED_SSM_PARAMETERS.previewsBucketName,
    );
    const sharedBucket = Bucket.fromBucketName(this, 'SharedPreviewsBucket', sharedBucketName);
    const previewsDistribution = Distribution.fromDistributionAttributes(
      this,
      'SharedPreviewsDistribution',
      {
        distributionId: StringParameter.valueForStringParameter(
          this,
          SHARED_SSM_PARAMETERS.previewsDistributionId,
        ),
        domainName: StringParameter.valueForStringParameter(
          this,
          SHARED_SSM_PARAMETERS.previewsDistributionDomain,
        ),
      },
    );
    const keyPrefix = previewS3Prefix(props);
    new BucketDeployment(this, 'Deploy', {
      sources: [Source.asset(path.resolve(props.assetsPath))],
      destinationBucket: sharedBucket,
      destinationKeyPrefix: keyPrefix,
      prune: false,
      distribution: previewsDistribution,
      distributionPaths: [`/${keyPrefix}/*`],
      memoryLimit: BUCKET_DEPLOYMENT_MEMORY_MIB,
    });
    return `https://${previewHostname(props)}`;
  }
}
