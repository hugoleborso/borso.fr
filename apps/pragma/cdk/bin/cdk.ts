#!/usr/bin/env tsx
/**
 * CDK entry point for `pragma.borso.fr`.
 *
 * Required env:
 *   - CDK_DEFAULT_ACCOUNT (or AWS_ACCOUNT_ID)
 *   - STAGE = 'prod' | 'preview'        (default 'prod')
 *   - PR_NUMBER                         (required when STAGE=preview)
 *
 * Stack layout:
 *   - pragma-cluster (always): owns the DSQL cluster.
 *   - pragma-{prod | pr-<N>}: composes StaticSite + LambdaApi +
 *     DsqlSchema via PreviewableApp, plus the S3 uploads bucket.
 */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DsqlClusterStack,
  requireAwsAccount,
  requireDeployStage,
  requirePrNumber,
} from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';
import { buildPragmaAppStack } from '../lib/stack.js';

const APP_SLUG = 'pragma';
const PROD_DOMAIN = 'pragma.borso.fr';
const REGION = 'eu-west-3';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT_RELATIVE = path.resolve(HERE, '..', '..');
const ASSETS_PATH = path.join(REPO_ROOT_RELATIVE, 'dist');
const API_ENTRY = path.join(REPO_ROOT_RELATIVE, 'api', 'src', 'main.ts');
const MIGRATIONS_PATH = path.join(REPO_ROOT_RELATIVE, 'api', 'src', 'database', 'migrations');

/**
 * @Blueprint cdk-app-entrypoint
 * @BlueprintName CDK Application Entry Point
 * @BlueprintUsage Use for the executable that turns the deploy environment into one CDK application tree.
 * @BlueprintDescription Reads every required environment variable through the `require…` helpers before a single construct exists, so a missing account or PR number fails before synth rather than producing a stack named after `undefined`, then routes the stage to a stack name and builds the cluster stack and the application stack in that order; the two front end only applications use the same shape in `apps/<slug>/bin/app.ts` without the cluster and database arm, which is why they are followers of this one rather than a pattern of their own.
 */
const account = requireAwsAccount();
const stage = requireDeployStage();
if (stage === 'integ') {
  throw new Error("pragma: stage 'integ' is reserved and not deployable from this app.");
}

const prNumber = stage === 'preview' ? requirePrNumber() : undefined;
const stackSuffix = stage === 'prod' ? 'prod' : `pr-${prNumber}`;
const appStackName = `${APP_SLUG}-${stackSuffix}`;
const clusterStackName = `${APP_SLUG}-cluster`;

const app = new App();
const env = { account, region: REGION };

const clusterStack = new DsqlClusterStack(app, clusterStackName, { app: APP_SLUG, env });

const appStack = new Stack(app, appStackName, { env });

buildPragmaAppStack({
  scope: appStack,
  stage,
  ...(prNumber === undefined ? {} : { prNumber }),
  domainName: stage === 'prod' ? PROD_DOMAIN : undefined,
  assetsPath: ASSETS_PATH,
  apiEntry: API_ENTRY,
  migrationsPath: MIGRATIONS_PATH,
  cluster: clusterStack.cluster,
});
