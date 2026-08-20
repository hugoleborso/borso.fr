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

/**
 * @Blueprint app-cdk-stack
 * @BlueprintName Application CDK Stack
 * @BlueprintUsage Use for the module that composes the shared constructs into the infrastructure of one application.
 * @BlueprintDescription A plain function taking its scope in the props rather than a subclass of `Stack`, so the entry point keeps the stack identity and a test can synthesise the composition into a throwaway stack; it declares the resources the application owns itself first, hands them to `PreviewableApp` through conditional spreads so an absent prop is never passed as an explicit `undefined`, and grants the Lambda its bucket access afterwards from the construct's own handler.
 */
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
      ...(isProduction
        ? {}
        : {
            cloneFromSchema: {
              sourceSchemaName: 'prod',
              tableBlocklist: ['auth_attempt'],
              columnsToNullify: { member: ['avatar_s3_key'] },
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
