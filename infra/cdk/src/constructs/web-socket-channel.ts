import { CfnOutput, Duration } from 'aws-cdk-lib';
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import type { IGrantable } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import {
  assertDeployStage,
  lambdaFunctionName,
  type Stage,
  validateAppSlug,
} from '../internal/naming.utils.js';
import { applyStandardTags } from '../internal/tags.js';

const DEFAULT_MEMORY_MIB = 512;
const DEFAULT_TIMEOUT_SECONDS = 10;
const NODE_BUILTIN_REQUIRE_SHIM_BANNER =
  "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";
const HANDLER_SLUG = 'websocket';
const ROUTE_SELECTION_EXPRESSION = '$request.body.action';
const CALLBACK_URL_ENVIRONMENT_NAME = 'WEBSOCKET_CALLBACK_URL';
const INTEGRATION_ID = 'Int';

export interface WebSocketChannelProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly entry: string;
  readonly memoryMb?: number;
  readonly timeoutSeconds?: number;
  readonly environment?: Readonly<Record<string, string>>;
}

// @FollowsBlueprint reusable-cdk-construct
export class WebSocketChannel extends Construct {
  public readonly api: WebSocketApi;
  public readonly stage: WebSocketStage;
  public readonly handler: NodejsFunction;
  public readonly callbackUrl: string;
  public readonly clientUrl: string;

  constructor(scope: Construct, id: string, props: WebSocketChannelProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    applyStandardTags(this, props);

    const logGroup = new LogGroup(this, 'Logs', {
      logGroupName: `/aws/lambda/${lambdaFunctionName(props, HANDLER_SLUG)}`,
      retention: RetentionDays.ONE_WEEK,
    });

    this.handler = new NodejsFunction(this, 'Fn', {
      functionName: lambdaFunctionName(props, HANDLER_SLUG),
      entry: props.entry,
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: props.memoryMb ?? DEFAULT_MEMORY_MIB,
      timeout: Duration.seconds(props.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS),
      tracing: Tracing.ACTIVE,
      logGroup,
      environment: {
        STAGE: props.stage,
        APP: props.app,
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

    const integration = new WebSocketLambdaIntegration(INTEGRATION_ID, this.handler);
    this.api = new WebSocketApi(this, 'WebSocketApi', {
      apiName: `${props.app}-${props.stage}-${HANDLER_SLUG}`,
      routeSelectionExpression: ROUTE_SELECTION_EXPRESSION,
      connectRouteOptions: { integration },
      disconnectRouteOptions: { integration },
      defaultRouteOptions: { integration },
    });

    const stageName =
      props.prNumber === undefined ? props.stage : `${props.stage}-pr-${props.prNumber}`;
    this.stage = new WebSocketStage(this, 'Stage', {
      webSocketApi: this.api,
      stageName,
      autoDeploy: true,
    });

    this.callbackUrl = this.stage.callbackUrl;
    this.clientUrl = this.stage.url;
    this.handler.addEnvironment(CALLBACK_URL_ENVIRONMENT_NAME, this.callbackUrl);

    new CfnOutput(this, 'ClientUrl', { value: this.clientUrl });
  }

  public grantManageConnections(grantee: IGrantable): void {
    this.stage.grantManagementApiAccess(grantee);
  }
}
