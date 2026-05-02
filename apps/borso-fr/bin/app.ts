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

import { App, Stack } from 'aws-cdk-lib';
import { StaticSite } from '@borso/infra';

const APP_SLUG = 'borso-fr';
const PROD_DOMAIN = 'borso.fr';
const REGION = 'eu-west-3';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is required but not set.`);
  }
  return v;
}

function parseStage(): 'prod' | 'preview' {
  const raw = process.env.STAGE ?? 'prod';
  if (raw !== 'prod' && raw !== 'preview') {
    throw new Error(`STAGE must be 'prod' or 'preview', got '${raw}'.`);
  }
  return raw;
}

function parsePrNumber(): number {
  const raw = requireEnv('PR_NUMBER');
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`PR_NUMBER must be a positive integer, got '${raw}'.`);
  }
  return n;
}

const account = process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID;
if (!account) {
  throw new Error('Set CDK_DEFAULT_ACCOUNT or AWS_ACCOUNT_ID before deploying.');
}

const stage = parseStage();
const prNumber = stage === 'preview' ? parsePrNumber() : undefined;
const stackName = stage === 'prod' ? `${APP_SLUG}-prod` : `${APP_SLUG}-pr-${prNumber}`;

const app = new App();
const stack = new Stack(app, stackName, { env: { account, region: REGION } });

new StaticSite(stack, 'Site', {
  app: APP_SLUG,
  stage,
  ...(prNumber !== undefined ? { prNumber } : {}),
  ...(stage === 'prod' ? { domainName: PROD_DOMAIN } : {}),
  assetsPath: './dist',
});
