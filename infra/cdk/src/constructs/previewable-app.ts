import { CfnOutput, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import {
  assertDeployStage,
  type BucketNameSuffix,
  frontendOrigin,
  isProductionStage,
  previewApiHostname,
  type Stage,
  validateAppSlug,
} from '../internal/naming.utils.js';
import { ORIGIN_VERIFY_ENVIRONMENT_VARIABLE } from '../internal/client-address.js';
import { SHARED_SSM_PARAMETERS } from '../internal/shared-ssm.js';
import {
  isApiServedThroughCloudFront,
  selectSameOriginApiDomainName,
  selectTestSeedEnvironment,
} from '../internal/stage-wiring.utils.js';
import { applyStandardTags } from '../internal/tags.js';

const ORIGIN_VERIFY_SECRET_LENGTH = 64;
import type { IDsqlCluster } from './dsql-cluster.js';
import { DsqlSchema, type DsqlSchemaCloneFromConfig } from './dsql-schema.js';
import { LambdaApi } from './lambda-api.js';
import { StaticSite } from './static-site.js';

export interface PreviewableAppProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly domainName?: string;
  readonly frontend: {
    readonly distPath: string;
    readonly bucketNameSuffix?: BucketNameSuffix;
  };
  readonly api?: {
    readonly entry: string;
    readonly customDomainHostname?: string;
    readonly memoryMb?: number;
    readonly timeoutSeconds?: number;
    readonly environment?: Readonly<Record<string, string>>;
  };
  readonly database?: {
    readonly migrationsPath: string;
    readonly cluster: IDsqlCluster;
    readonly cloneFromSchema?: DsqlSchemaCloneFromConfig;
  };
}

// @FollowsBlueprint reusable-cdk-construct
export class PreviewableApp extends Construct {
  public readonly site: StaticSite;
  public readonly api: LambdaApi | undefined;
  public readonly database: DsqlSchema | undefined;
  public readonly cluster: IDsqlCluster | undefined;

  constructor(scope: Construct, id: string, props: PreviewableAppProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    applyStandardTags(this, props);

    if (props.database) {
      this.cluster = props.database.cluster;
      this.database = new DsqlSchema(this, 'Db', {
        app: props.app,
        stage: props.stage,
        prNumber: props.prNumber,
        migrationsPath: props.database.migrationsPath,
        cluster: this.cluster,
        ...(props.database.cloneFromSchema === undefined
          ? {}
          : { cloneFromSchema: props.database.cloneFromSchema }),
      });
    }

    const isApiBehindCloudFront = isApiServedThroughCloudFront(
      props.stage,
      props.api !== undefined,
    );
    const originVerifyValue = isApiBehindCloudFront ? createOriginVerifyValue(this) : undefined;

    if (props.api) {
      if (isProductionStage(props.stage) && !props.domainName) {
        throw new Error('domainName is required for stage="prod".');
      }
      const apiCustomDomain = resolveApiCustomDomain(
        this,
        { app: props.app, stage: props.stage, prNumber: props.prNumber },
        props.api,
      );
      this.api = new LambdaApi(this, 'Api', {
        app: props.app,
        stage: props.stage,
        prNumber: props.prNumber,
        entry: props.api.entry,
        ...(apiCustomDomain ? { customDomain: apiCustomDomain } : {}),
        allowedOrigins: [
          frontendOrigin(
            { app: props.app, stage: props.stage, prNumber: props.prNumber },
            props.domainName,
          ),
        ],
        memoryMb: props.api.memoryMb,
        timeoutSeconds: props.api.timeoutSeconds,
        environment: {
          ...selectTestSeedEnvironment(props.stage),
          ...props.api.environment,
          ...(originVerifyValue === undefined
            ? {}
            : { [ORIGIN_VERIFY_ENVIRONMENT_VARIABLE]: originVerifyValue }),
        },
        dsqlSchema: this.database,
      });
    }

    const sameOriginApiDomainName =
      this.api === undefined
        ? undefined
        : selectSameOriginApiDomainName(props.stage, apiHttpHostname(this.api));

    this.site = new StaticSite(this, 'Site', {
      app: props.app,
      stage: props.stage,
      prNumber: props.prNumber,
      domainName: props.domainName,
      assetsPath: props.frontend.distPath,
      spaFallback: true,
      ...(props.frontend.bucketNameSuffix === undefined
        ? {}
        : { bucketNameSuffix: props.frontend.bucketNameSuffix }),
      ...(sameOriginApiDomainName === undefined || originVerifyValue === undefined
        ? {}
        : { api: { domainName: sameOriginApiDomainName, originVerifyValue } }),
    });

    new CfnOutput(this, 'FrontendUrl', { value: this.site.url });
    if (this.api) {
      new CfnOutput(this, 'ApiUrl', { value: this.api.url });
    }
    if (this.database) {
      new CfnOutput(this, 'DbSchema', { value: this.database.schemaName });
    }
  }
}

function createOriginVerifyValue(scope: Construct): string {
  const secret = new Secret(scope, 'OriginVerifySecret', {
    description: 'Shared between CloudFront and the API: proves a request came through CloudFront',
    generateSecretString: {
      excludePunctuation: true,
      passwordLength: ORIGIN_VERIFY_SECRET_LENGTH,
    },
    removalPolicy: RemovalPolicy.DESTROY,
  });
  return secret.secretValue.unsafeUnwrap();
}

function apiHttpHostname(api: LambdaApi): string {
  return `${api.httpApi.apiId}.execute-api.${Stack.of(api).region}.amazonaws.com`;
}

function resolveApiCustomDomain(
  scope: Construct,
  context: { readonly app: string; readonly stage: Stage; readonly prNumber?: number },
  apiOptions: { readonly customDomainHostname?: string },
):
  | {
      readonly hostname: string;
      readonly certificateArn: string;
      readonly hostedZoneId: string;
      readonly hostedZoneName: string;
    }
  | undefined {
  if (isProductionStage(context.stage)) return undefined;
  const hostname = apiOptions.customDomainHostname ?? previewApiHostname(context);
  return {
    hostname,
    certificateArn: StringParameter.valueForStringParameter(
      scope,
      SHARED_SSM_PARAMETERS.certPreviewRegionalArn,
    ),
    hostedZoneId: StringParameter.valueForStringParameter(
      scope,
      SHARED_SSM_PARAMETERS.hostedZoneId,
    ),
    hostedZoneName: StringParameter.valueForStringParameter(
      scope,
      SHARED_SSM_PARAMETERS.hostedZoneName,
    ),
  };
}
