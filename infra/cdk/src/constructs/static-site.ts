import * as path from 'node:path';
import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  HttpVersion,
  PriceClass,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, AaaaRecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import {
  type Stage,
  assertDeployStage,
  bucketName,
  previewHostname,
  previewS3Prefix,
  validateAppSlug,
} from '../internal/naming.js';
import { applyStandardTags } from '../internal/tags.js';

/**
 * SSM parameter paths owned by infra/shared/. Constructs read these at synth
 * time. Keep in sync with infra/shared/lib/*.ts.
 */
const SHARED_SSM = {
  oidcProviderArn: '/borso/shared/oidc-provider-arn',
  hostedZoneId: '/borso/shared/hosted-zone-id',
  hostedZoneName: '/borso/shared/hosted-zone-name',
  certBorsoFrArn: '/borso/shared/cert-borso-fr-arn',
  certPreviewArn: '/borso/shared/cert-preview-borso-fr-arn',
  previewsBucketName: '/borso/shared/previews-bucket-name',
  previewsDistributionId: '/borso/shared/previews-distribution-id',
  previewsDistributionDomain: '/borso/shared/previews-distribution-domain',
} as const;

/**
 * @beta
 */
export interface StaticSiteProps {
  /** App slug, kebab-case (e.g. "borso-fr"). */
  readonly app: string;
  /** Deployment stage. */
  readonly stage: Stage;
  /**
   * Apex/subdomain for prod (e.g. "borso.fr" or "borsouvertures.borso.fr").
   * Required for stage="prod"; ignored for preview/integ.
   */
  readonly domainName?: string;
  /** PR number for preview/integ stages. */
  readonly prNumber?: number;
  /** Path to the directory with built assets to upload. */
  readonly assetsPath: string;
}

/**
 * S3 + CloudFront static-site construct.
 *
 * - **prod**: dedicated bucket + dedicated CloudFront distribution + Route 53
 *   alias on `domainName`. ACM cert is looked up from SSM (must be in
 *   us-east-1).
 * - **preview** / **integ**: uploads to the shared previews bucket at a
 *   key prefix; URL is served by the shared previews distribution via
 *   host-based routing (see `cf-host-routing-function.ts`).
 *
 * @beta
 */
export class StaticSite extends Construct {
  public readonly url: string;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    applyStandardTags(this, props);

    if (props.stage === 'prod') {
      this.url = this.buildProd(props);
    } else {
      this.url = this.buildPreview(props);
    }

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
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const certArn = StringParameter.valueForStringParameter(this, SHARED_SSM.certBorsoFrArn);
    const cert = Certificate.fromCertificateArn(this, 'Cert', certArn);

    const distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
      },
      defaultRootObject: 'index.html',
      domainNames: [props.domainName],
      certificate: cert,
      httpVersion: HttpVersion.HTTP2_AND_3,
      priceClass: PriceClass.PRICE_CLASS_100,
      errorResponses: [
        // Serve the JPEG directly as the 404 response body (no wrapping HTML).
        // CloudFront returns the file as-is; S3 supplies the image/jpeg
        // Content-Type. The browser renders it as a full-page image.
        { httpStatus: 404, responsePagePath: '/404.jpeg', ttl: Duration.minutes(5) },
      ],
    });

    new BucketDeployment(this, 'Deploy', {
      sources: [Source.asset(path.resolve(props.assetsPath))],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
    });

    const zoneName = StringParameter.valueForStringParameter(this, SHARED_SSM.hostedZoneName);
    const zoneId = StringParameter.valueForStringParameter(this, SHARED_SSM.hostedZoneId);
    const zone = HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: zoneId,
      zoneName,
    });
    new ARecord(this, 'AliasA', {
      zone,
      recordName: props.domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
    new AaaaRecord(this, 'AliasAAAA', {
      zone,
      recordName: props.domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    return `https://${props.domainName}`;
  }

  private buildPreview(props: StaticSiteProps): string {
    const sharedBucketName = StringParameter.valueForStringParameter(
      this,
      SHARED_SSM.previewsBucketName,
    );
    const sharedBucket = Bucket.fromBucketName(this, 'SharedPreviewsBucket', sharedBucketName);
    // Look up the shared previews distribution so BucketDeployment can issue
    // a CloudFront invalidation for this PR's prefix on every redeploy.
    // Without this, CloudFront keeps serving the previously-cached HTML
    // until TTL (default ~24h), which is invisible-magic painful when
    // iterating on a preview.
    const previewsDistribution = Distribution.fromDistributionAttributes(
      this,
      'SharedPreviewsDistribution',
      {
        distributionId: StringParameter.valueForStringParameter(
          this,
          SHARED_SSM.previewsDistributionId,
        ),
        domainName: StringParameter.valueForStringParameter(
          this,
          SHARED_SSM.previewsDistributionDomain,
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
      // Scope the invalidation to this PR's hostname-routed prefix, so
      // co-tenant previews don't pay for unrelated cache busting.
      distributionPaths: [`/${keyPrefix}/*`],
    });
    return `https://${previewHostname(props)}`;
  }
}
