#!/usr/bin/env tsx
/**
 * CDK entry point for the apex `borso.fr` static site.
 *
 * Required env:
 *   - CDK_DEFAULT_ACCOUNT (or AWS_ACCOUNT_ID)
 *   - STAGE = 'prod' | 'preview'        (default 'prod')
 *   - PR_NUMBER                         (required when STAGE=preview)
 *
 * Stage routing:
 *   - prod    → stack borso-fr-prod, alias borso.fr
 *   - preview → stack borso-fr-pr-<N>, hosted at borso-fr-pr-<N>.preview.borso.fr
 *
 * Builds the static assets via the workspace's `build` script before synth/
 * deploy (chained in package.json), so the construct's `assetsPath: './dist'`
 * is always populated.
 */

import {
  StaticSite,
  requireAwsAccount,
  requireDeployStage,
  requirePrNumber,
} from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';

const APP_SLUG = 'borso-fr';
const PROD_DOMAIN = 'borso.fr';
const REGION = 'eu-west-3';
const ASSETS_PATH = './dist';

const account = requireAwsAccount();
const stage = requireDeployStage();
if (stage === 'integ') {
  throw new Error("borso-fr: stage 'integ' is reserved and not deployable from this app.");
}
const prNumber = stage === 'preview' ? requirePrNumber() : undefined;
const stackName = stage === 'prod' ? `${APP_SLUG}-prod` : `${APP_SLUG}-pr-${prNumber}`;

const app = new App();
const stack = new Stack(app, stackName, { env: { account, region: REGION } });

new StaticSite(stack, 'Site', {
  app: APP_SLUG,
  stage,
  ...(prNumber !== undefined ? { prNumber } : {}),
  ...(stage === 'prod' ? { domainName: PROD_DOMAIN } : {}),
  assetsPath: ASSETS_PATH,
});
