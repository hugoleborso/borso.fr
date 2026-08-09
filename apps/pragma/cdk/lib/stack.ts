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

import { type IDsqlCluster, isProductionStage, PreviewableApp, type Stage } from '@borso/infra';
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
  const isProduction = isProductionStage(props.stage);
  const uploadsBucket = new Bucket(props.scope, 'UploadsBucket', {
    bucketName: `${APP_SLUG}-${props.stage}-uploads${props.prNumber === undefined ? '' : `-${props.prNumber}`}`,
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
    ...(props.prNumber === undefined ? {} : { prNumber: props.prNumber }),
    ...(props.domainName === undefined ? {} : { domainName: props.domainName }),
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
      // Neon-branch-style clone: every non-prod schema starts as a copy of
      // prod's data, so a preview shows the real catalogue, members, setlists
      // and sessions rather than a fixture. Skipped automatically for the prod
      // stack (source === target) and for the very first app deploy (source
      // doesn't exist yet).
      //
      // `app_config` is cloned ON PURPOSE, which is the opposite of the call
      // made for last-loop-lepin, and the difference is what the password
      // protects. There, the cloned data is race results that prod publishes
      // anyway, so the PIN was the only secret and sharing it across stages
      // meant a preview compromise reached prod's admin. Here the DATA is the
      // secret, so the preview needs a real password — and the only one that
      // is neither hard-coded in this public repository nor in need of
      // distribution is production's own. Blocking the row would force a
      // second credential into the repo or into CI, which is worse.
      //
      // Consequence, stated because it is a real trade: `app_config` also
      // carries `hmac_key`, the symmetric key signing session cookies. Every
      // preview therefore holds key material that would validate against prod.
      // Accepted deliberately — the alternative is a shared secret with a
      // wider blast radius. `rotatePassword()` rerolls the key if a preview is
      // ever suspected.
      //
      // `auth_attempt` is rate-limit state and is meaningless across schemas.
      // `member.avatar_s3_key` is NULLed so the preview does not ask its own
      // uploads bucket for a key that only exists in prod's; the UI already
      // falls back to the initials avatar. `song.chart` is deliberately NOT
      // nullified — most charts are inline ChordPro text, which is the useful
      // part, and a PDF chart merely 404s.
      ...(isProduction
        ? {}
        : {
            cloneFromSchema: {
              sourceSchemaName: 'prod',
              tableBlocklist: ['auth_attempt'],
              columnsToNullify: { member: ['avatar_s3_key'] },
              // `app_config` is a singleton keyed on id=1, and the clone
              // INSERT is ON CONFLICT DO NOTHING. Without this, a schema that
              // was bootstrapped before cloning existed keeps its old row, so
              // the preview stays on the fixture's published password while
              // now holding real production data. Replacing makes prod's
              // credential authoritative on every deploy.
              tablesToReplace: ['app_config'],
            },
          }),
    },
  });

  if (previewableApp.api !== undefined) {
    uploadsBucket.grantPut(previewableApp.api.handler);
    uploadsBucket.grantRead(previewableApp.api.handler);
  }
}
