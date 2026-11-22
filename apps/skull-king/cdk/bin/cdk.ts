#!/usr/bin/env tsx

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DsqlClusterStack,
  requireAwsAccount,
  requireDeployStage,
  requirePrNumber,
} from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';
import { buildSkullKingAppStack } from '../lib/stack.js';

const APP_SLUG = 'skull-king';
const PROD_DOMAIN = 'skull-king.borso.fr';
const REGION = 'eu-west-3';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(HERE, '..', '..');
const ASSETS_PATH = path.join(WORKSPACE_ROOT, 'dist');
const API_ENTRY = path.join(WORKSPACE_ROOT, 'api', 'src', 'main.ts');
const WEBSOCKET_ENTRY = path.join(WORKSPACE_ROOT, 'api', 'src', 'main.websocket.ts');
const MIGRATIONS_PATH = path.join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations');

// @FollowsBlueprint cdk-app-entrypoint
const account = requireAwsAccount();
const stage = requireDeployStage();
if (stage === 'integ') {
  throw new Error("skull-king: stage 'integ' is reserved and not deployable from this app.");
}

function readOptionalSetting(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === '' ? undefined : value;
}

const errorReportingDsn = readOptionalSetting('SKULL_KING_SENTRY_DSN');
const release = readOptionalSetting('GITHUB_SHA');

const prNumber = stage === 'preview' ? requirePrNumber() : undefined;
const stackSuffix = stage === 'prod' ? 'prod' : `pr-${prNumber}`;
const appStackName = `${APP_SLUG}-${stackSuffix}`;
const clusterStackName = `${APP_SLUG}-cluster`;

const app = new App();
const env = { account, region: REGION };

const clusterStack = new DsqlClusterStack(app, clusterStackName, { app: APP_SLUG, env });

const appStack = new Stack(app, appStackName, { env });

buildSkullKingAppStack({
  scope: appStack,
  stage,
  ...(prNumber === undefined ? {} : { prNumber }),
  domainName: stage === 'prod' ? PROD_DOMAIN : undefined,
  assetsPath: ASSETS_PATH,
  apiEntry: API_ENTRY,
  websocketEntry: WEBSOCKET_ENTRY,
  migrationsPath: MIGRATIONS_PATH,
  cluster: clusterStack.cluster,
  ...(errorReportingDsn === undefined
    ? {}
    : {
        errorReporting: {
          dsn: errorReportingDsn,
          ...(release === undefined ? {} : { release }),
        },
      }),
});
