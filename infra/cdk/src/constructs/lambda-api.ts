import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import {
  CorsHttpMethod,
  type CorsPreflightOptions,
  HttpApi,
  HttpMethod,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Alarm, ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { Architecture, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import {
  type Stage,
  assertDeployStage,
  lambdaFunctionName,
  validateAppSlug,
} from '../internal/naming.js';
import { applyStandardTags } from '../internal/tags.js';
import type { DsqlSchema } from './dsql-schema.js';

/** @beta */
export interface LambdaApiProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  /**
   * Single Hono-style Lambda entry. Exports an APIGW v2 handler that does
   * its own internal routing across methods + paths. The HTTP API forwards
   * every request to it via the `$default` route + `ANY /{proxy+}` catchall.
   */
  readonly entry: string;
  /** Memory in MiB. Default: 512. */
  readonly memoryMb?: number;
  /** Timeout in seconds. Default: 10. */
  readonly timeoutSeconds?: number;
  /**
   * Reserved concurrent executions. Default: 10 — guards against runaway
   * billing.
   */
  readonly reservedConcurrency?: number;
  readonly environment?: Readonly<Record<string, string>>;
  /** If provided, the Lambda is granted IAM auth to this DSQL schema. */
  readonly dsqlSchema?: DsqlSchema;
  /** Optional custom domain (e.g. "api.borso.fr"). DNS is the caller's job. */
  readonly customDomain?: string;
  readonly cors?: CorsPreflightOptions;
}

/**
 * One HTTP API + one Lambda handling every method + path.
 *
 * @beta
 */
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
      memorySize: props.memoryMb ?? 512,
      timeout: Duration.seconds(props.timeoutSeconds ?? 10),
      reservedConcurrentExecutions: props.reservedConcurrency ?? 10,
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
        // Re-expose CommonJS `require` for transitive deps that need it.
        // Some AWS SDK + smithy packages (notably `@aws-sdk/dsql-signer`
        // → `@smithy/util-buffer-from`) do `require('buffer')` at module
        // load, which esbuild's ESM `__require` shim can't resolve at
        // runtime — the Lambda cold-starts with `Dynamic require of
        // "buffer" is not supported`. The banner patches the shim with a
        // real `createRequire` so every Node built-in + any other CJS
        // transitive dep just works.
        banner: 'import { createRequire } from \'module\'; const require = createRequire(import.meta.url);',
      },
    });

    this.httpApi = new HttpApi(this, 'HttpApi', {
      apiName,
      corsPreflight: props.cors ?? {
        allowOrigins: ['*'],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PUT,
          CorsHttpMethod.PATCH,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.OPTIONS,
        ],
        maxAge: Duration.minutes(10),
      },
    });

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
      metric: this.handler.metricErrors({ period: Duration.minutes(5) }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    props.dsqlSchema?.grantConnect(this.handler);

    this.url = props.customDomain
      ? `https://${props.customDomain}`
      : `https://${this.httpApi.apiId}.execute-api.${stack.region}.amazonaws.com`;

    new CfnOutput(this, 'Url', { value: this.url });
  }
}
