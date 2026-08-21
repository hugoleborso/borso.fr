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
