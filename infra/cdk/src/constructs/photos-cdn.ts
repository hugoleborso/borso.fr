import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  HttpVersion,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, AaaaRecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import type { IBucket } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { type Stage, assertDeployStage, validateAppSlug } from '../internal/naming.js';
import { applyStandardTags } from '../internal/tags.js';

const SHARED_SSM = {
  hostedZoneId: '/borso/shared/hosted-zone-id',
  hostedZoneName: '/borso/shared/hosted-zone-name',
  certBorsoFrArn: '/borso/shared/cert-borso-fr-arn',
  certPreviewArn: '/borso/shared/cert-preview-borso-fr-arn',
} as const;

const PHOTOS_CACHE_MAX_AGE_SECONDS = 86_400;

/**
 * @beta
 *
 * Inputs for {@link PhotosCdn}. The construct does NOT create the S3 bucket
 * (the bucket lifecycle — `RETAIN` on prod vs. `DESTROY` on previews — lives
 * with the app stack, which owns the user-generated-content trade-off).
 * It only attaches the CloudFront distribution, the OAC, and the Route 53
 * alias records.
 */
export interface PhotosCdnProps {
  /** App slug, kebab-case. Used for tagging only. */
  readonly app: string;
  /** Deployment stage. */
  readonly stage: Stage;
  /** PR number for preview/integ stages. */
  readonly prNumber?: number;
  /**
   * Existing S3 bucket holding the runner photos. The construct grants
   * the CloudFront OAC service principal `s3:GetObject` on this bucket
   * via a resource policy, scoped to the distribution ARN.
   */
  readonly bucket: IBucket;
  /**
   * Fully-qualified hostname for the CDN. Examples:
   *   - prod: `photos-cdn.borso.fr` (covered by the `*.borso.fr` wildcard cert).
   *   - preview: `<app>-pr-<n>-photos.preview.borso.fr` (one level deep —
   *     fits under `*.preview.borso.fr`).
   */
  readonly hostname: string;
}

/**
 * CloudFront-fronted access to a private S3 bucket of runner photos.
 *
 * Single distribution per app+stage, deterministic URL
 * `https://<hostname>/<photoKey>`, 24h cache (spec Q.O.D. row 7). The
 * bucket stays private — only the OAC service principal can read it; the
 * distribution does the public-facing read.
 *
 * @beta
 */
export class PhotosCdn extends Construct {
  public readonly distribution: Distribution;
  public readonly hostname: string;

  constructor(scope: Construct, id: string, props: PhotosCdnProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    applyStandardTags(this, props);
    this.hostname = props.hostname;

    const certSsmPath =
      props.stage === 'prod' ? SHARED_SSM.certBorsoFrArn : SHARED_SSM.certPreviewArn;
    const certArn = StringParameter.valueForStringParameter(this, certSsmPath);
    const certificate = Certificate.fromCertificateArn(this, 'Cert', certArn);

    // Cache policy with TTLs pinned to the 24h spec target. The S3 origin
    // doesn't set Cache-Control on uploads today, so CloudFront's
    // defaultTtl is what reaches the viewer.
    const cachePolicy = new CachePolicy(this, 'CachePolicy', {
      cachePolicyName: `${props.app}-${props.stage}-photos${
        props.prNumber !== undefined ? `-pr-${props.prNumber}` : ''
      }`,
      defaultTtl: Duration.seconds(PHOTOS_CACHE_MAX_AGE_SECONDS),
      maxTtl: Duration.seconds(PHOTOS_CACHE_MAX_AGE_SECONDS),
      minTtl: Duration.seconds(0),
    });

    this.distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(props.bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy,
        compress: true,
      },
      domainNames: [props.hostname],
      certificate,
      httpVersion: HttpVersion.HTTP2_AND_3,
      priceClass: PriceClass.PRICE_CLASS_100,
    });

    const zoneName = StringParameter.valueForStringParameter(this, SHARED_SSM.hostedZoneName);
    const zoneId = StringParameter.valueForStringParameter(this, SHARED_SSM.hostedZoneId);
    const zone = HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: zoneId,
      zoneName,
    });
    // Force absolute FQDN so CDK's ARecord doesn't double-suffix the zone
    // name (see static-site.ts for the same dantotsu).
    const recordName = props.hostname.endsWith('.') ? props.hostname : `${props.hostname}.`;
    new ARecord(this, 'AliasA', {
      zone,
      recordName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
    });
    new AaaaRecord(this, 'AliasAAAA', {
      zone,
      recordName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
    });

    new CfnOutput(this, 'Hostname', { value: props.hostname });
  }
}
