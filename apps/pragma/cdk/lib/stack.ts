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
 * Test-seed flag: `PRAGMA_ALLOW_TEST_SEED=1` is mirrored from the
 * last-loop-lepin pattern but currently unused (no /__test routes on
 * the API yet); kept as a documented hook for future preview-only
 * seeding.
 */

import {
  type IDsqlCluster,
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

  const allowSeedFlag: Record<string, string> =
    props.stage === 'prod' ? {} : { PRAGMA_ALLOW_TEST_SEED: '1' };

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
        ...allowSeedFlag,
      },
    },
    database: {
      migrationsPath: props.migrationsPath,
      cluster: props.cluster,
    },
  });

  if (previewableApp.api !== undefined) {
    uploadsBucket.grantPut(previewableApp.api.handler);
    uploadsBucket.grantRead(previewableApp.api.handler);
  }
}
