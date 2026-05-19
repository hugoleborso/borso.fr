#!/usr/bin/env tsx
/**
 * CDK entry point for `pragma.borso.fr`.
 *
 * v1 scaffold only — the full stack composition (LambdaApi + StaticSite
 * + DsqlCluster + DsqlSchema + S3 uploads bucket) lands in a follow-up
 * PR. This entry point currently exists so `pnpm run typecheck` and
 * `pnpm run synth` resolve their tsconfig inputs.
 */

import { App, Stack } from 'aws-cdk-lib';
import { buildPragmaAppStack } from '../lib/stack.js';

const APP_SLUG = 'pragma';
const REGION = 'eu-west-3';

const account = process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID;
if (account === undefined || account.length === 0) {
  throw new Error('CDK_DEFAULT_ACCOUNT or AWS_ACCOUNT_ID must be set.');
}

const app = new App();
const stack = new Stack(app, `${APP_SLUG}-scaffold`, { env: { account, region: REGION } });
buildPragmaAppStack({ scope: stack });
