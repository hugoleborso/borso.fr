import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import {
  CorsHttpMethod,
  type CorsPreflightOptions,
  DomainName,
  HttpApi,
  HttpMethod,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Alarm, ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { Architecture, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { AaaaRecord, ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import {
  assertDeployStage,
  lambdaFunctionName,
  type Stage,
  validateAppSlug,
} from '../internal/naming.utils.js';
import { applyStandardTags } from '../internal/tags.js';
import type { DsqlSchema } from './dsql-schema.js';

const DEFAULT_MEMORY_MIB = 512;
const DEFAULT_TIMEOUT_SECONDS = 10;
const DEFAULT_RESERVED_CONCURRENCY = 10;
const CORS_PREFLIGHT_MAX_AGE_MINUTES = 10;
const ERROR_ALARM_PERIOD_MINUTES = 5;
const NODE_BUILTIN_REQUIRE_SHIM_BANNER =
  "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";
const FULLY_QUALIFIED_DOMAIN_SUFFIX = '.';

export interface LambdaApiProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly entry: string;
  readonly memoryMb?: number;
  readonly timeoutSeconds?: number;
  readonly reservedConcurrency?: number;
  readonly environment?: Readonly<Record<string, string>>;
  readonly dsqlSchema?: DsqlSchema;
  readonly customDomain?: {
    readonly hostname: string;
    readonly certificateArn: string;
    readonly hostedZoneId: string;
    readonly hostedZoneName: string;
  };
  readonly allowedOrigins?: readonly string[];
  readonly cors?: CorsPreflightOptions;
}

// @FollowsBlueprint reusable-cdk-construct
export class LambdaApi extends Construct {
  public readonly httpApi: HttpApi;
  public readonly handler: NodejsFunction;
  public readonly url: string;

  constructor(scope: Construct, id: string, props: LambdaApiProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    applyStandardTags(this, props);

    const stack = Stack.of(this);
    const apiName = `${props.app}-${props.stage}-api`;
    const handlerSlug = 'api';

    const logGroup = new LogGroup(this, 'Logs', {
      logGroupName: `/aws/lambda/${lambdaFunctionName(props, handlerSlug)}`,
      retention: RetentionDays.ONE_WEEK,
    });

    this.handler = new NodejsFunction(this, 'Fn', {
      functionName: lambdaFunctionName(props, handlerSlug),
      entry: props.entry,
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: props.memoryMb ?? DEFAULT_MEMORY_MIB,
      timeout: Duration.seconds(props.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS),
      reservedConcurrentExecutions: props.reservedConcurrency ?? DEFAULT_RESERVED_CONCURRENCY,
      tracing: Tracing.ACTIVE,
      logGroup,
      environment: {
        STAGE: props.stage,
        APP: props.app,
        ...(props.dsqlSchema
          ? {
              DSQL_ENDPOINT: props.dsqlSchema.clusterEndpoint,
              DSQL_SCHEMA: props.dsqlSchema.schemaName,
            }
          : {}),
        ...props.environment,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node22',
        format: OutputFormat.ESM,
        mainFields: ['module', 'main'],
        banner: NODE_BUILTIN_REQUIRE_SHIM_BANNER,
      },
    });

    const apiDomainName = props.customDomain
      ? new DomainName(this, 'DomainName', {
          domainName: props.customDomain.hostname,
          certificate: Certificate.fromCertificateArn(
            this,
            'DomainCert',
            props.customDomain.certificateArn,
          ),
        })
      : undefined;

    const corsMethods = [
      CorsHttpMethod.GET,
      CorsHttpMethod.POST,
      CorsHttpMethod.PUT,
      CorsHttpMethod.PATCH,
      CorsHttpMethod.DELETE,
      CorsHttpMethod.OPTIONS,
    ];
    const defaultCors: CorsPreflightOptions =
      props.allowedOrigins && props.allowedOrigins.length > 0
        ? {
            allowOrigins: [...props.allowedOrigins],
            allowCredentials: true,
            allowHeaders: ['content-type', 'authorization'],
            allowMethods: corsMethods,
            maxAge: Duration.minutes(CORS_PREFLIGHT_MAX_AGE_MINUTES),
          }
        : {
            allowOrigins: ['*'],
            allowMethods: corsMethods,
            maxAge: Duration.minutes(CORS_PREFLIGHT_MAX_AGE_MINUTES),
          };

    this.httpApi = new HttpApi(this, 'HttpApi', {
      apiName,
      corsPreflight: props.cors ?? defaultCors,
      ...(apiDomainName ? { defaultDomainMapping: { domainName: apiDomainName } } : {}),
    });

    if (props.customDomain && apiDomainName) {
      const zone = HostedZone.fromHostedZoneAttributes(this, 'DomainZone', {
        hostedZoneId: props.customDomain.hostedZoneId,
        zoneName: props.customDomain.hostedZoneName,
      });
      const aliasTarget = RecordTarget.fromAlias(
        new ApiGatewayv2DomainProperties(
          apiDomainName.regionalDomainName,
          apiDomainName.regionalHostedZoneId,
        ),
      );
      const fullyQualifiedHostname = `${props.customDomain.hostname}${FULLY_QUALIFIED_DOMAIN_SUFFIX}`;
      new ARecord(this, 'DomainAliasA', {
        zone,
        recordName: fullyQualifiedHostname,
        target: aliasTarget,
      });
      new AaaaRecord(this, 'DomainAliasAAAA', {
        zone,
        recordName: fullyQualifiedHostname,
        target: aliasTarget,
      });
    }

    const integration = new HttpLambdaIntegration('Int', this.handler);
    this.httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration,
    });
    this.httpApi.addRoutes({
      path: '/',
      methods: [HttpMethod.ANY],
      integration,
    });

    new Alarm(this, 'Errors', {
      metric: this.handler.metricErrors({ period: Duration.minutes(ERROR_ALARM_PERIOD_MINUTES) }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    props.dsqlSchema?.grantConnect(this.handler);

    this.url = props.customDomain
      ? `https://${props.customDomain.hostname}`
      : `https://${this.httpApi.apiId}.execute-api.${stack.region}.amazonaws.com`;

    new CfnOutput(this, 'Url', { value: this.url });
  }
}
