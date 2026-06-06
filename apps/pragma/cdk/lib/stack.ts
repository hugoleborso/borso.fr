/**
 * Pragma CDK stack — composes the four production constructs:
 *   - `PreviewableApp` (StaticSite + LambdaApi + DsqlSchema) from
 *     `@borso/infra`.
 *   - `S3 Bucket` for chord-chart uploads, CORS-open to the StaticSite
 *     origin so the front-end can `fetch(...)` the chart variants.
 *
 * Auth secret wiring is intentionally absent: per ADR-0004, the
 * password hash + HMAC signing key live in the application DB row
 * `pragma.app_config`, not in Secrets Manager. The stack therefore
 * carries no `AWS::SecretsManager::Secret` resources — the test
 * `stack.test.ts` asserts that.
 *
 * Test-seed flag: `ALLOW_TEST_SEED=1` is injected on non-prod API
 * Lambdas by `PreviewableApp` itself, not here — the construct owns the
 * prod-exclusion. The API reads it to mount `/api/__test/seed`.
 */

import { type IDsqlCluster, PreviewableApp, type Stage } from '@borso/infra';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

const APP_SLUG = 'pragma';
const CHART_UPLOAD_CORS_MAX_AGE_SECONDS = 300;
const ABORT_MULTIPART_UPLOAD_DAYS = 1;

export interface BuildPragmaAppStackProps {
  readonly scope: Construct;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly domainName: string | undefined;
  readonly assetsPath: string;
  readonly apiEntry: string;
  readonly migrationsPath: string;
  readonly cluster: IDsqlCluster;
}

export function buildPragmaAppStack(props: BuildPragmaAppStackProps): void {
  const uploadsBucket = new Bucket(props.scope, 'UploadsBucket', {
    bucketName: `${APP_SLUG}-${props.stage}-uploads${props.prNumber !== undefined ? `-${props.prNumber}` : ''}`,
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
        maxAge: CHART_UPLOAD_CORS_MAX_AGE_SECONDS,
      },
    ],
    lifecycleRules: [
      { abortIncompleteMultipartUploadAfter: Duration.days(ABORT_MULTIPART_UPLOAD_DAYS) },
    ],
  });

  const previewableApp = new PreviewableApp(props.scope, 'App', {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber !== undefined ? { prNumber: props.prNumber } : {}),
    ...(props.domainName !== undefined ? { domainName: props.domainName } : {}),
    frontend: { distPath: props.assetsPath },
    api: {
      entry: props.apiEntry,
      environment: {
        UPLOADS_BUCKET: uploadsBucket.bucketName,
      },
    },
    database: {
      migrationsPath: props.migrationsPath,
      cluster: props.cluster,
      // Neon-branch-style clone: every non-prod schema starts as a copy
      // of prod so the admin password (seeded once in prod via ADR-0004's
      // app_config row) carries over, members + songs + sessions + setlists
      // are realistic for debug, and the operator doesn't have to re-seed
      // each preview by hand. Skipped automatically by the construct for
      // prod (source === target) and for the very first app deploy
      // (source doesn't exist yet — falls back to migrate-from-empty).
      // - `auth_attempt` blocklisted so the preview starts with a clean
      //   rate-limit window; `app_config` is intentionally NOT in the
      //   blocklist (we WANT prod's password to come over).
      // - `member.avatar_s3_key` + `song.chart` are nullified because
      //   they reference prod's `pragma-uploads` bucket; preview's
      //   bucket is `pragma-preview-uploads-<pr>` and the keys don't
      //   exist there — without nullify the preview's chord-chart PDFs
      //   + avatars would 403.
      ...(props.stage !== 'prod'
        ? {
            cloneFromSchema: {
              sourceSchemaName: 'prod',
              tableBlocklist: ['auth_attempt'],
              columnsToNullify: {
                member: ['avatar_s3_key'],
                song: ['chart'],
              },
            },
          }
        : {}),
    },
  });

  if (previewableApp.api !== undefined) {
    uploadsBucket.grantPut(previewableApp.api.handler);
    uploadsBucket.grantRead(previewableApp.api.handler);
  }
}
