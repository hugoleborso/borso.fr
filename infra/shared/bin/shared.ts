#!/usr/bin/env tsx
import { App } from 'aws-cdk-lib';
import { CertsStack } from '../lib/certs-stack.js';
import { SharedStack } from '../lib/shared-stack.js';

const CERTS_STACK_NAME = 'borso-shared-certs';
const SHARED_STACK_NAME = 'borso-shared';
const CERTS_REGION = 'us-east-1';
const DEFAULT_PRIMARY_REGION = 'eu-west-3';

const app = new App();

const account = process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID;
if (!account) {
  throw new Error(
    'Set CDK_DEFAULT_ACCOUNT (or AWS_ACCOUNT_ID) before deploying shared infra.',
  );
}

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
});
