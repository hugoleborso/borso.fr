#!/usr/bin/env tsx
/**
 * CDK entry point for `last-loop-lepin.borso.fr`.
 *
 * Required env:
 *   - CDK_DEFAULT_ACCOUNT (or AWS_ACCOUNT_ID)
 *   - STAGE = 'prod' | 'preview'        (default 'prod')
 *   - PR_NUMBER                         (required when STAGE=preview)
 *
 * Stack layout:
 *   - last-loop-lepin-cluster (always): owns the DSQL cluster.
 *   - last-loop-lepin-{prod | pr-<N>}: composes StaticSite + LambdaApi +
 *     DsqlSchema via PreviewableApp.
 *
 * The test-seed endpoint (`/api/__test/seed`) is mounted only when the
 * Lambda's `LASTLOOP_ALLOW_TEST_SEED` env var is set to `'1'`. The stack
 * sets that flag for stage !== 'prod' only; `stack.test.ts` asserts the
 * env var is absent from the prod template.
 */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DsqlClusterStack,
  PreviewableApp,
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
  ...(prNumber !== undefined ? { prNumber } : {}),
  domainName: stage === 'prod' ? PROD_DOMAIN : undefined,
  assetsPath: ASSETS_PATH,
  apiEntry: API_ENTRY,
  migrationsPath: MIGRATIONS_PATH,
  cluster: clusterStack.cluster,
});

// `PreviewableApp` is exported for consumers that want to wire side
// constructs to the produced infra (not used here, but the type import
// keeps the construct API surface visible to readers).
void PreviewableApp;
