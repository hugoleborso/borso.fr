import {
  agentReaderPrincipalArn,
  type IDsqlCluster,
  isProductionStage,
  PreviewableApp,
  type Stage,
  WebSocketChannel,
} from '@borso/infra';
import type { Construct } from 'constructs';

const APP_SLUG = 'banana-rush';
const REALTIME_CONSTRUCT_ID = 'Realtime';
const APP_CONSTRUCT_ID = 'App';
const WEBSOCKET_CALLBACK_URL_VARIABLE = 'WEBSOCKET_CALLBACK_URL';
const WEBSOCKET_CLIENT_URL_VARIABLE = 'WEBSOCKET_CLIENT_URL';
const DSQL_ENDPOINT_VARIABLE = 'DSQL_ENDPOINT';
const DSQL_SCHEMA_VARIABLE = 'DSQL_SCHEMA';
const DSQL_ROLE_VARIABLE = 'DSQL_ROLE';
const ERROR_REPORTING_DSN_VARIABLE = 'SENTRY_DSN';
const ERROR_REPORTING_RELEASE_VARIABLE = 'SENTRY_RELEASE';

export interface ErrorReportingProject {
  readonly dsn: string;
  readonly release?: string;
}

export interface BuildBananaRushAppStackProps {
  readonly scope: Construct;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly domainName: string | undefined;
  readonly assetsPath: string;
  readonly apiEntry: string;
  readonly websocketEntry: string;
  readonly migrationsPath: string;
  readonly cluster: IDsqlCluster;
  readonly errorReporting?: ErrorReportingProject;
}

function buildErrorReportingEnvironment(
  project: ErrorReportingProject | undefined,
): Record<string, string> {
  if (project === undefined) return {};
  return {
    [ERROR_REPORTING_DSN_VARIABLE]: project.dsn,
    ...(project.release === undefined
      ? {}
      : { [ERROR_REPORTING_RELEASE_VARIABLE]: project.release }),
  };
}

// @FollowsBlueprint app-cdk-stack
export function buildBananaRushAppStack(props: BuildBananaRushAppStackProps): void {
  const isProduction = isProductionStage(props.stage);
  const errorReportingEnvironment = buildErrorReportingEnvironment(props.errorReporting);
  const previewableApp = new PreviewableApp(props.scope, APP_CONSTRUCT_ID, {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber === undefined ? {} : { prNumber: props.prNumber }),
    ...(props.domainName === undefined ? {} : { domainName: props.domainName }),
    frontend: { distPath: props.assetsPath },
    api: { entry: props.apiEntry, environment: errorReportingEnvironment },
    database: {
      migrationsPath: props.migrationsPath,
      cluster: props.cluster,
      ...(isProduction ? { readerPrincipalArns: [agentReaderPrincipalArn(props.scope)] } : {}),
    },
  });

  const database = previewableApp.database;
  const channel = new WebSocketChannel(props.scope, REALTIME_CONSTRUCT_ID, {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber === undefined ? {} : { prNumber: props.prNumber }),
    entry: props.websocketEntry,
    environment: {
      ...errorReportingEnvironment,
      ...(database === undefined
        ? {}
        : {
            [DSQL_ENDPOINT_VARIABLE]: database.clusterEndpoint,
            [DSQL_SCHEMA_VARIABLE]: database.schemaName,
            [DSQL_ROLE_VARIABLE]: database.apiRoleName,
          }),
    },
  });
  database?.grantConnect(channel.handler);

  if (previewableApp.api !== undefined) {
    previewableApp.api.handler.addEnvironment(WEBSOCKET_CALLBACK_URL_VARIABLE, channel.callbackUrl);
    previewableApp.api.handler.addEnvironment(WEBSOCKET_CLIENT_URL_VARIABLE, channel.clientUrl);
    channel.grantManageConnections(previewableApp.api.handler);
  }
}
