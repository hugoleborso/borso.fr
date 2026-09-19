import { type IDsqlCluster, PreviewableApp, type Stage, WebSocketChannel } from '@borso/infra';
import type { Construct } from 'constructs';

const APP_SLUG = 'banana-rush';
const REALTIME_CONSTRUCT_ID = 'Realtime';
const APP_CONSTRUCT_ID = 'App';
const WEBSOCKET_CALLBACK_URL_VARIABLE = 'WEBSOCKET_CALLBACK_URL';
const WEBSOCKET_CLIENT_URL_VARIABLE = 'WEBSOCKET_CLIENT_URL';
const DSQL_ENDPOINT_VARIABLE = 'DSQL_ENDPOINT';
const DSQL_SCHEMA_VARIABLE = 'DSQL_SCHEMA';

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
}

// @FollowsBlueprint app-cdk-stack
export function buildBananaRushAppStack(props: BuildBananaRushAppStackProps): void {
  const previewableApp = new PreviewableApp(props.scope, APP_CONSTRUCT_ID, {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber === undefined ? {} : { prNumber: props.prNumber }),
    ...(props.domainName === undefined ? {} : { domainName: props.domainName }),
    frontend: { distPath: props.assetsPath },
    api: { entry: props.apiEntry },
    database: {
      migrationsPath: props.migrationsPath,
      cluster: props.cluster,
    },
  });

  const database = previewableApp.database;
  const channel = new WebSocketChannel(props.scope, REALTIME_CONSTRUCT_ID, {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber === undefined ? {} : { prNumber: props.prNumber }),
    entry: props.websocketEntry,
    ...(database === undefined
      ? {}
      : {
          environment: {
            [DSQL_ENDPOINT_VARIABLE]: database.clusterEndpoint,
            [DSQL_SCHEMA_VARIABLE]: database.schemaName,
          },
        }),
  });
  database?.grantConnect(channel.handler);

  if (previewableApp.api !== undefined) {
    previewableApp.api.handler.addEnvironment(WEBSOCKET_CALLBACK_URL_VARIABLE, channel.callbackUrl);
    previewableApp.api.handler.addEnvironment(WEBSOCKET_CLIENT_URL_VARIABLE, channel.clientUrl);
    channel.grantManageConnections(previewableApp.api.handler);
  }
}
