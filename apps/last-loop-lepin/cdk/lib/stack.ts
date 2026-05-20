import {
  type IDsqlCluster,
  PhotosCdn,
  PreviewableApp,
  type Stage,
} from '@borso/infra';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

const APP_SLUG = 'last-loop-lepin';
const PHOTOS_CDN_PROD_HOSTNAME = 'photos-cdn.borso.fr';

export interface BuildAppStackProps {
  readonly scope: Construct;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly domainName: string | undefined;
  readonly assetsPath: string;
  readonly apiEntry: string;
  readonly migrationsPath: string;
  readonly cluster: IDsqlCluster;
}

/**
 * Frontend origin the API Lambda will accept on state-changing requests.
 * Used by `requireAdminSession` for the CSRF Origin-header check. Prod
 * is the apex domain; preview is the per-PR `<app>-pr-<N>.preview.borso.fr`
 * hostname. Dev sets `ALLOWED_ORIGIN` locally (typically
 * `http://localhost:5173`).
 */
function frontendOrigin(stage: Stage, domainName: string | undefined, prNumber: number | undefined): string {
  if (stage === 'prod') {
    if (domainName === undefined) {
      throw new Error('frontendOrigin: domainName required for stage="prod".');
    }
    return `https://${domainName}`;
  }
  return `https://${APP_SLUG}-pr-${prNumber ?? 0}.preview.borso.fr`;
}

/**
 * Composes the StaticSite + LambdaApi + DsqlSchema for the app, plus the
 * S3 bucket the admin uploads runner photos to.
 *
 * The `LASTLOOP_ALLOW_TEST_SEED` env var is set on the Lambda for every
 * deploy stage EXCEPT `prod` — verified by `stack.test.ts`.
 *
 * Admin auth lives entirely in the DB (`admin_credentials` for the PIN
 * scrypt hash, `admin_sessions` for the session-cookie state). Replaces
 * the two Secrets Manager secrets the older flow used ($0.40/mo each):
 * the operator seeds the PIN hash row after the first deploy via psql,
 * sessions are random ids minted by the Lambda on each login.
 */
export function buildLastLoopLepinAppStack(props: BuildAppStackProps): void {
  const photosBucket = new Bucket(props.scope, 'PhotosBucket', {
    bucketName: `${APP_SLUG}-${props.stage}-photos${props.prNumber !== undefined ? `-${props.prNumber}` : ''}`,
    encryption: BucketEncryption.S3_MANAGED,
    blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
    removalPolicy: props.stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    autoDeleteObjects: props.stage !== 'prod',
    cors: [
      {
        allowedMethods: [HttpMethods.PUT, HttpMethods.GET],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        maxAge: 300,
      },
    ],
    lifecycleRules: [{ abortIncompleteMultipartUploadAfter: Duration.days(1) }],
  });

  // Photos CDN — CloudFront fronting `photosBucket`, deterministic URL
  // scheme `https://<hostname>/<photoKey>`. Spec
  // `docs/features/last-loop-lepin/runner-photos-everywhere`. The
  // `PHOTOS_CDN_HOST` env var flows into the API Lambda so the runner
  // DTO mapper can compose `photoUrl` server-side.
  const photosCdnHostname =
    props.stage === 'prod'
      ? PHOTOS_CDN_PROD_HOSTNAME
      : `${APP_SLUG}-pr-${props.prNumber ?? 0}-photos.preview.borso.fr`;
  const photosCdn = new PhotosCdn(props.scope, 'PhotosCdn', {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber !== undefined ? { prNumber: props.prNumber } : {}),
    bucket: photosBucket,
    hostname: photosCdnHostname,
  });

  const allowSeedFlag: Record<string, string> =
    props.stage === 'prod' ? {} : { LASTLOOP_ALLOW_TEST_SEED: '1' };

  const previewableApp = new PreviewableApp(props.scope, 'App', {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber !== undefined ? { prNumber: props.prNumber } : {}),
    ...(props.domainName !== undefined ? { domainName: props.domainName } : {}),
    frontend: { distPath: props.assetsPath },
    api: {
      entry: props.apiEntry,
      environment: {
        PHOTOS_BUCKET: photosBucket.bucketName,
        PHOTOS_CDN_HOST: photosCdn.hostname,
        ALLOWED_ORIGIN: frontendOrigin(props.stage, props.domainName, props.prNumber),
        ...allowSeedFlag,
      },
    },
    database: {
      migrationsPath: props.migrationsPath,
      cluster: props.cluster,
    },
  });

  if (previewableApp.api !== undefined) {
    photosBucket.grantPut(previewableApp.api.handler);
    photosBucket.grantRead(previewableApp.api.handler);
  }
}
