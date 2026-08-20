import { CfnOutput, Stack } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import {
  assertDeployStage,
  frontendOrigin,
  isProductionStage,
  previewApiHostname,
  type Stage,
  validateAppSlug,
} from '../internal/naming.utils.js';
import { SHARED_SSM_PARAMETERS } from '../internal/shared-ssm.js';
import {
  selectSameOriginApiDomainName,
  selectTestSeedEnvironment,
} from '../internal/stage-wiring.utils.js';
import { applyStandardTags } from '../internal/tags.js';
import type { IDsqlCluster } from './dsql-cluster.js';
import { DsqlSchema, type DsqlSchemaCloneFromConfig } from './dsql-schema.js';
import { LambdaApi } from './lambda-api.js';
import { StaticSite } from './static-site.js';

export interface PreviewableAppProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly domainName?: string;
  readonly frontend: { readonly distPath: string };
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
      ...(sameOriginApiDomainName === undefined
        ? {}
        : { api: { domainName: sameOriginApiDomainName } }),
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
