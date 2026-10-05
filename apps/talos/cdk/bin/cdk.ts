#!/usr/bin/env tsx

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DsqlClusterStack, requireAwsAccount, requireDeployStage } from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';
import { buildTalosAppStack } from '../lib/stack.js';

const APP_SLUG = 'talos';
const PROD_DOMAIN = 'talos.borso.fr';
const REGION = 'eu-west-3';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(HERE, '..', '..');

// @FollowsBlueprint cdk-app-entrypoint
const account = requireAwsAccount();
if (requireDeployStage() !== 'prod') {
  throw new Error('talos: only the prod stage exists, a preview would publish private data.');
}

const app = new App();
const env = { account, region: REGION };

const clusterStack = new DsqlClusterStack(app, `${APP_SLUG}-cluster`, { app: APP_SLUG, env });
const appStack = new Stack(app, `${APP_SLUG}-prod`, { env });

buildTalosAppStack({
  scope: appStack,
  domainName: PROD_DOMAIN,
  assetsPath: path.join(WORKSPACE_ROOT, 'dist'),
  apiEntry: path.join(WORKSPACE_ROOT, 'api', 'src', 'main.ts'),
  migrationsPath: path.join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations'),
  cluster: clusterStack.cluster,
});
