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
import { AaaaRecord, ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import type { IBucket } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import {
  assertDeployStage,
  isProductionStage,
  type Stage,
  validateAppSlug,
} from '../internal/naming.utils.js';
import { SHARED_SSM_PARAMETERS } from '../internal/shared-ssm.js';
import { applyStandardTags } from '../internal/tags.js';

const PHOTOS_CACHE_MAX_AGE_SECONDS = 86_400;
const FULLY_QUALIFIED_DOMAIN_SUFFIX = '.';

export interface PhotosCdnProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly bucket: IBucket;
  readonly hostname: string;
}

/**
 * @Blueprint reusable-cdk-construct
 * @BlueprintName Reusable CDK Construct
 * @BlueprintUsage Use for any piece of infrastructure more than one application stack composes.
 * @BlueprintDescription A `Construct` subclass whose constructor opens with the same four line prologue every construct in this package repeats: `super(scope, id)`, then `validateAppSlug(props.app)`, then `assertDeployStage(props.stage)` so a stack cannot be synthesised for the development stage, then `applyStandardTags(this, props)` so every resource below carries the tags the deploy roles are scoped to. Inputs arrive through one readonly props interface documenting what the construct deliberately does not own, the values a caller needs are assigned to readonly members, and the constructor closes with a `CfnOutput` so the deployed value is readable from the console.
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

    const certSsmPath = isProductionStage(props.stage)
      ? SHARED_SSM_PARAMETERS.certBorsoFrArn
      : SHARED_SSM_PARAMETERS.certPreviewArn;
    const certArn = StringParameter.valueForStringParameter(this, certSsmPath);
    const certificate = Certificate.fromCertificateArn(this, 'Cert', certArn);

    const cachePolicy = new CachePolicy(this, 'CachePolicy', {
      cachePolicyName: `${props.app}-${props.stage}-photos${
        props.prNumber === undefined ? '' : `-pr-${props.prNumber}`
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
    const fullyQualifiedHostname = props.hostname.endsWith(FULLY_QUALIFIED_DOMAIN_SUFFIX)
      ? props.hostname
      : `${props.hostname}${FULLY_QUALIFIED_DOMAIN_SUFFIX}`;
    new ARecord(this, 'AliasA', {
      zone,
      recordName: fullyQualifiedHostname,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
    });
    new AaaaRecord(this, 'AliasAAAA', {
      zone,
      recordName: fullyQualifiedHostname,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
    });

    new CfnOutput(this, 'Hostname', { value: props.hostname });
  }
}
