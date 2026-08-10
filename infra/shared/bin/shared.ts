#!/usr/bin/env tsx
import { requireAwsAccount, requireEnv } from '@borso/infra';
import { App } from 'aws-cdk-lib';
import { CertsStack } from '../lib/certs-stack.js';
import { SharedStack } from '../lib/shared-stack.js';

const CERTS_STACK_NAME = 'borso-shared-certs';
const SHARED_STACK_NAME = 'borso-shared';
const CERTS_REGION = 'us-east-1';
const DEFAULT_PRIMARY_REGION = 'eu-west-3';
const BUDGET_EMAIL_ENV = 'BORSO_BUDGET_EMAIL';

// @FollowsBlueprint cdk-app-entrypoint
const app = new App();

const account = requireAwsAccount();
const budgetEmail = requireEnv(BUDGET_EMAIL_ENV);
const primaryRegion = process.env.BORSO_REGION ?? DEFAULT_PRIMARY_REGION;

const certs = new CertsStack(app, CERTS_STACK_NAME, {
  env: { account, region: CERTS_REGION },
  crossRegionReferences: true,
});

new SharedStack(app, SHARED_STACK_NAME, {
  env: { account, region: primaryRegion },
  crossRegionReferences: true,
  borsoFrCert: certs.borsoFrCert,
  previewCert: certs.previewCert,
  budgetEmail,
});
