import * as path from 'node:path';
import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  Function as CloudFrontFunction,
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
import { STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE } from '../internal/cf-static-site-index-rewrite.js';

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
  /**
   * Optional same-origin API routing for prod. When set, the prod
   * CloudFront distribution forwards requests matching `pathPattern`
   * (default `/api/*`) to `domainName` as an additional origin. Used by
   * full-stack apps that compose a `LambdaApi` alongside the site — the
   * frontend can then call `/api/*` same-origin, no CORS needed.
   *
   * Ignored for preview/integ stages: previews use the shared CloudFront
   * distribution (no per-PR routing surface there) and rely on a
   * cross-origin API hostname injected at build time via `VITE_API_BASE`.
   */
  readonly api?: {
    /** API origin hostname (no scheme, no path). */
    readonly domainName: string;
    /** CloudFront path pattern. Default: `/api/*`. */
    readonly pathPattern?: string;
  };
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
      // Static-site buckets hold only build artefacts from dist/ — no
      // user-generated content, fully rebuildable from source. The usual
      // "RETAIN buckets to protect user data" reflex buys no protection
      // here, and the combination of pinned bucketName + RETAIN caused
      // the failed-first-deploy orphan trap (see dantotsu
      // cdk-failed-deploy-leaves-retained-buckets-orphaned). DESTROY +
      // autoDeleteObjects: failed creates roll back cleanly, intentional
      // destroys actually destroy.
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const certArn = StringParameter.valueForStringParameter(this, SHARED_SSM.certBorsoFrArn);
    const cert = Certificate.fromCertificateArn(this, 'Cert', certArn);

    // Rewrites directory-style URIs to /<dir>/index.html so subpaths like
    // /art/mondrian/ and /art/mondrian both resolve to the index.html in S3.
    // CloudFront's `defaultRootObject` only handles the apex /, not nested
    // dirs. See infra/cdk/src/internal/cf-static-site-index-rewrite.code.js.
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
      errorResponses: [
        // Serve the JPEG directly as the 404 response body (no wrapping HTML).
        // CloudFront returns the file as-is; S3 supplies the image/jpeg
        // Content-Type. The browser renders it as a full-page image.
        { httpStatus: 404, responsePagePath: '/404.jpeg', ttl: Duration.minutes(5) },
      ],
    });

    if (props.api) {
      // Same-origin API routing. CACHING_DISABLED keeps every request reaching
      // the Lambda (API responses are per-user, edge caching would leak between
      // sessions). ALL_VIEWER_EXCEPT_HOST_HEADER forwards every viewer header
      // to the API — except Host, which CloudFront must override to the
      // *.execute-api.* origin hostname so API Gateway's virtual-host routing
      // resolves to the right HTTP API.
      distribution.addBehavior(
        props.api.pathPattern ?? '/api/*',
        new HttpOrigin(props.api.domainName),
        {
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      );
    }

    // Grant the CloudFront OAC principal s3:ListBucket so S3 can return 404
    // for missing keys instead of 403. The default OAC policy only grants
    // s3:GetObject, which leaves S3 unable to disambiguate "not found" from
    // "forbidden" — so it returns 403 for both. With ListBucket added, S3
    // can answer NoSuchKey and CloudFront's errorResponses 404 -> /404.jpeg
    // mapping fires for genuinely-missing paths.
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
      // 128 MB (the default) leaves no headroom for `aws s3 sync` to upload
      // multi-MiB media bundles and crashes with `[SSL: UNEXPECTED_EOF_WHILE_READING]`.
      memoryLimit: 512,
    });

    const zoneName = StringParameter.valueForStringParameter(this, SHARED_SSM.hostedZoneName);
    const zoneId = StringParameter.valueForStringParameter(this, SHARED_SSM.hostedZoneId);
    const zone = HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: zoneId,
      zoneName,
    });
    // CDK's ARecord treats a recordName without a trailing dot as relative to
    // the zone and silently appends the zone name. Passing `'borso.fr'` against
    // zone `borso.fr` yields the R53 record `borso.fr.borso.fr.` — a record
    // that resolves nothing useful and forced operators to recreate the alias
    // manually outside CDK. Force absolute (FQDN with trailing dot) so the
    // record always matches `props.domainName` exactly.
    const recordName = props.domainName.endsWith('.') ? props.domainName : `${props.domainName}.`;
    new ARecord(this, 'AliasA', {
      zone,
      recordName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
    new AaaaRecord(this, 'AliasAAAA', {
      zone,
      recordName,
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
      // 128 MB (the default) leaves no headroom for `aws s3 sync` to upload
      // multi-MiB media bundles and crashes with `[SSL: UNEXPECTED_EOF_WHILE_READING]`.
      memoryLimit: 512,
    });
    return `https://${previewHostname(props)}`;
  }
}
