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
import { buildLastLoopLepinAppStack } from '../lib/stack.js';

const APP_SLUG = 'last-loop-lepin';
const PROD_DOMAIN = 'last-loop-lepin.borso.fr';
const REGION = 'eu-west-3';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT_RELATIVE = path.resolve(HERE, '..', '..');
const ASSETS_PATH = path.join(REPO_ROOT_RELATIVE, 'dist');
const API_ENTRY = path.join(REPO_ROOT_RELATIVE, 'api', 'src', 'main.ts');
const MIGRATIONS_PATH = path.join(REPO_ROOT_RELATIVE, 'api', 'src', 'database', 'migrations');

// @FollowsBlueprint cdk-app-entrypoint
const account = requireAwsAccount();
const stage = requireDeployStage();
if (stage === 'integ') {
  throw new Error("last-loop-lepin: stage 'integ' is reserved and not deployable from this app.");
}

const prNumber = stage === 'preview' ? requirePrNumber() : undefined;
const stackSuffix = stage === 'prod' ? 'prod' : `pr-${prNumber}`;
const appStackName = `${APP_SLUG}-${stackSuffix}`;
const clusterStackName = `${APP_SLUG}-cluster`;

const app = new App();
const env = { account, region: REGION };

const clusterStack = new DsqlClusterStack(app, clusterStackName, { app: APP_SLUG, env });

const appStack = new Stack(app, appStackName, { env });

buildLastLoopLepinAppStack({
  scope: appStack,
  stage,
  ...(prNumber === undefined ? {} : { prNumber }),
  domainName: stage === 'prod' ? PROD_DOMAIN : undefined,
  assetsPath: ASSETS_PATH,
  apiEntry: API_ENTRY,
  migrationsPath: MIGRATIONS_PATH,
  cluster: clusterStack.cluster,
});
