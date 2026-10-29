import {
  agentReaderPrincipalArn,
  apiPublicOrigin,
  frontendOrigin,
  type IDsqlCluster,
  isProductionStage,
  PreviewableApp,
  type Stage,
} from '@borso/infra';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

const API_TIMEOUT_SECONDS = 20;
const APP_SLUG = 'pragma';
const SPOTIFY_CREDENTIALS_PARAMETER = `/${APP_SLUG}/spotify-credentials`;

const SECRET_TABLES_REPLACED_ON_PREVIEW = ['app_config', 'member_credential'];
const SECRET_TABLES_BLOCKED_ON_PREVIEW = [
  'assistant_authorization_code',
  'assistant_client',
  'assistant_grant',
  'auth_attempt',
  'calendar_feed',
  'member_calendar_feed',
  'member_passkey',
  'push_subscription',
  'vapid_key_pair',
  'webauthn_challenge',
];
const BALLOT_TOKEN_TABLES = ['audience_suggestion', 'audience_vote'];
const READER_TABLE_BLOCKLIST = [
  ...SECRET_TABLES_REPLACED_ON_PREVIEW,
  ...SECRET_TABLES_BLOCKED_ON_PREVIEW,
  ...BALLOT_TOKEN_TABLES,
];

const ASSISTANT_PATH_PATTERNS = [
  '/mcp',
  '/oauth/authorize',
  '/oauth/token',
  '/oauth/register',
  '/oauth/revoke',
  '/.well-known/oauth-*',
];

const PRODUCTION_STAGE: Stage = 'prod';
const TAKE_OBJECT_KEYS = 'take/*';

const CHART_UPLOAD_CORS_MAX_AGE_SECONDS = 300;
const ABORT_MULTIPART_UPLOAD_DAYS = 1;

export interface ErrorReportingProject {
  readonly dsn: string;
  readonly release?: string;
}

export interface BuildPragmaAppStackProps {
  readonly scope: Construct;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly domainName: string | undefined;
  readonly assetsPath: string;
  readonly apiEntry: string;
  readonly migrationsPath: string;
  readonly cluster: IDsqlCluster;
  readonly errorReporting?: ErrorReportingProject;
}

interface SiteOrigin {
  readonly origin: string;
  readonly hostname: string;
}

const SOURCE_MAPPED_STACK_TRACES = '--enable-source-maps';

function buildErrorReportingEnvironment(
  project: ErrorReportingProject | undefined,
): Record<string, string> {
  if (project === undefined) return {};
  return {
    SENTRY_DSN: project.dsn,
    NODE_OPTIONS: SOURCE_MAPPED_STACK_TRACES,
    ...(project.release === undefined ? {} : { SENTRY_RELEASE: project.release }),
  };
}

function readNameContext(props: BuildPragmaAppStackProps): {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
} {
  return {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber === undefined ? {} : { prNumber: props.prNumber }),
  };
}

function nameUploadsBucket(stage: Stage, prNumber: number | undefined): string {
  return `${APP_SLUG}-${stage}-uploads${prNumber === undefined ? '' : `-${prNumber}`}`;
}

function readSiteOrigin(props: BuildPragmaAppStackProps): SiteOrigin {
  const origin = frontendOrigin(readNameContext(props), props.domainName);
  return { origin, hostname: new URL(origin).hostname };
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
    bucketName: nameUploadsBucket(props.stage, props.prNumber),
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

  const siteOrigin = readSiteOrigin(props);
  const productionUploadsBucket = isProduction
    ? undefined
    : Bucket.fromBucketName(
        props.scope,
        'ProductionUploadsBucket',
        nameUploadsBucket(PRODUCTION_STAGE, undefined),
      );

  const previewableApp = new PreviewableApp(props.scope, 'App', {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber === undefined ? {} : { prNumber: props.prNumber }),
    ...(props.domainName === undefined ? {} : { domainName: props.domainName }),
    frontend: { distPath: props.assetsPath },
    api: {
      entry: props.apiEntry,
      timeoutSeconds: API_TIMEOUT_SECONDS,
      extraPathPatterns: ASSISTANT_PATH_PATTERNS,
      environment: {
        UPLOADS_BUCKET: uploadsBucket.bucketName,
        WEBAUTHN_RELYING_PARTY_ID: siteOrigin.hostname,
        WEBAUTHN_ORIGIN: siteOrigin.origin,
        OAUTH_ISSUER: apiPublicOrigin(readNameContext(props), props.domainName),
        OAUTH_CONSENT_ORIGIN: siteOrigin.origin,
        SPOTIFY_CREDENTIALS_PARAMETER,
        ...(productionUploadsBucket === undefined
          ? {}
          : { PRODUCTION_UPLOADS_BUCKET: productionUploadsBucket.bucketName }),
        ...buildErrorReportingEnvironment(props.errorReporting),
      },
    },
    database: {
      migrationsPath: props.migrationsPath,
      cluster: props.cluster,
      ...(isProduction
        ? {
            readerPrincipalArns: [agentReaderPrincipalArn(props.scope)],
            readerTableBlocklist: READER_TABLE_BLOCKLIST,
          }
        : {
            cloneFromSchema: {
              sourceSchemaName: 'prod',
              tableBlocklist: [...SECRET_TABLES_BLOCKED_ON_PREVIEW],
              tablesToReplace: [...SECRET_TABLES_REPLACED_ON_PREVIEW],
              columnsToNullify: { member: ['avatar_s3_key'] },
            },
          }),
    },
  });

  if (previewableApp.api !== undefined) {
    uploadsBucket.grantPut(previewableApp.api.handler);
    uploadsBucket.grantRead(previewableApp.api.handler);
    uploadsBucket.grantDelete(previewableApp.api.handler);
    if (productionUploadsBucket !== undefined) {
      previewableApp.api.handler.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject'],
          resources: [productionUploadsBucket.arnForObjects(TAKE_OBJECT_KEYS)],
        }),
      );
    }
    previewableApp.api.handler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [
          Stack.of(props.scope).formatArn({
            service: 'ssm',
            resource: 'parameter',
            resourceName: SPOTIFY_CREDENTIALS_PARAMETER.slice(1),
          }),
        ],
      }),
    );
  }
}
