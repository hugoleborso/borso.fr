/**
 * Last Loop Lépin CDK stack — composes `PreviewableApp` (StaticSite +
 * LambdaApi + DsqlSchema) from `@borso/infra`, the S3 bucket the admin
 * uploads runner photos to, and the `PhotosCdn` distribution in front of
 * it.
 *
 * Admin auth wiring is intentionally absent: per ADR-0004 the PIN scrypt
 * hash and the session state live in the application DB rows
 * `admin_credentials` and `admin_sessions`, not in Secrets Manager. The
 * stack therefore carries no `AWS::SecretsManager::Secret` resources and
 * no `PIN_HASH` or `JWT_SECRET` environment variable — the test
 * `stack.test.ts` asserts all three absences. The operator seeds the PIN
 * hash row through psql after the first deploy of a stage; sessions are
 * random ids the Lambda mints on each login.
 *
 * Test-seed flag: `ALLOW_TEST_SEED=1` is injected on non-prod API
 * Lambdas by `PreviewableApp` itself, not here — the construct owns the
 * prod-exclusion. The API reads it to mount `/api/__test/seed`.
 */

import {
  frontendOrigin,
  type IDsqlCluster,
  isProductionStage,
  PhotosCdn,
  PreviewableApp,
  type Stage,
} from '@borso/infra';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

const APP_SLUG = 'last-loop-lepin';
const PHOTOS_CDN_PROD_HOSTNAME = 'photos-cdn.borso.fr';

const PHOTO_UPLOAD_CORS_MAX_AGE_SECONDS = 300;
const ABORT_MULTIPART_UPLOAD_DAYS = 1;

/**
 * Mirrors the `previewSuffix` guard inside `@borso/infra`, which every other
 * per-stage name in this stack already goes through. Kept here because the
 * photos CDN hostname is composed in this file rather than by a construct.
 */
function requirePreviewSuffix(prNumber: number | undefined): string {
  if (prNumber === undefined) {
    throw new Error(`${APP_SLUG}: a non-production stage requires prNumber.`);
  }
  return `pr-${prNumber}`;
}

export interface BuildLastLoopLepinAppStackProps {
  readonly scope: Construct;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly domainName: string | undefined;
  readonly assetsPath: string;
  readonly apiEntry: string;
  readonly migrationsPath: string;
  readonly cluster: IDsqlCluster;
}

// @FollowsBlueprint app-cdk-stack
export function buildLastLoopLepinAppStack(props: BuildLastLoopLepinAppStackProps): void {
  const photosBucket = new Bucket(props.scope, 'PhotosBucket', {
    bucketName: `${APP_SLUG}-${props.stage}-photos${props.prNumber === undefined ? '' : `-${props.prNumber}`}`,
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
        maxAge: PHOTO_UPLOAD_CORS_MAX_AGE_SECONDS,
      },
    ],
    lifecycleRules: [
      { abortIncompleteMultipartUploadAfter: Duration.days(ABORT_MULTIPART_UPLOAD_DAYS) },
    ],
  });

  // Photos CDN — CloudFront fronting `photosBucket`, deterministic URL
  // scheme `https://<hostname>/<photoKey>`. Spec
  // `docs/features/last-loop-lepin/runner-photos-everywhere`. The
  // `PHOTOS_CDN_HOST` env var flows into the API Lambda so the runner
  // DTO mapper can compose `photoUrl` server-side.
  const isProduction = isProductionStage(props.stage);
  const photosCdnHostname = isProduction
    ? PHOTOS_CDN_PROD_HOSTNAME
    : `${APP_SLUG}-${requirePreviewSuffix(props.prNumber)}-photos.preview.borso.fr`;
  const photosCdn = new PhotosCdn(props.scope, 'PhotosCdn', {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber === undefined ? {} : { prNumber: props.prNumber }),
    bucket: photosBucket,
    hostname: photosCdnHostname,
  });

  const previewableApp = new PreviewableApp(props.scope, 'App', {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber === undefined ? {} : { prNumber: props.prNumber }),
    ...(props.domainName === undefined ? {} : { domainName: props.domainName }),
    frontend: { distPath: props.assetsPath },
    api: {
      entry: props.apiEntry,
      environment: {
        PHOTOS_BUCKET: photosBucket.bucketName,
        PHOTOS_CDN_HOST: photosCdn.hostname,
        ALLOWED_ORIGIN: frontendOrigin(
          { app: APP_SLUG, stage: props.stage, prNumber: props.prNumber },
          props.domainName,
        ),
      },
    },
    database: {
      migrationsPath: props.migrationsPath,
      cluster: props.cluster,
      // Neon-branch-style clone: every non-prod schema starts as a copy
      // of prod's data so the admin PIN (seeded once in prod) carries
      // over, the editions + runners + punches are realistic for debug,
      // and the operator doesn't have to re-seed each preview by hand.
      // Skipped automatically for the prod stack (source === target) and
      // for the very first app deploy (source doesn't exist yet).
      // Runtime-state tables (sessions, rate-limit buckets) keep their
      // structure but no rows; `runners.photo_key` is NULLed so the
      // preview's CDN doesn't dereference prod's S3 bucket.
      //
      // `admin_credentials` is blocked because a preview is a public URL and
      // must not hold production's PIN hash. ADR-0004 moved the PIN out of a
      // stage-shared Secrets Manager entry into a per-schema row precisely so
      // each stage would carry its own; cloning the row from prod put the
      // sharing back by another route. Consequence: a fresh preview has no
      // admin PIN and the admin area is unreachable until someone seeds the
      // row, which is the intended per-stage behaviour rather than a
      // regression.
      ...(isProduction
        ? {}
        : {
            cloneFromSchema: {
              sourceSchemaName: 'prod',
              tableBlocklist: ['admin_credentials', 'admin_sessions', 'auth_attempts'],
              columnsToNullify: { runners: ['photo_key'] },
            },
          }),
    },
  });

  if (previewableApp.api !== undefined) {
    photosBucket.grantPut(previewableApp.api.handler);
    photosBucket.grantRead(previewableApp.api.handler);
  }
}
