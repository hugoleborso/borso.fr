#!/usr/bin/env tsx
import { App } from 'aws-cdk-lib';
import { CertsStack } from '../lib/certs-stack.js';
import { SharedStack } from '../lib/shared-stack.js';

const app = new App();
const account = process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID;
if (!account) {
  throw new Error(
    'Set CDK_DEFAULT_ACCOUNT (or AWS_ACCOUNT_ID) before deploying shared infra.',
  );
}
const primaryRegion = process.env.BORSO_REGION ?? 'eu-west-3';

const certs = new CertsStack(app, 'borso-shared-certs', {
  env: { account, region: 'us-east-1' },
  crossRegionReferences: true,
});

new SharedStack(app, 'borso-shared', {
  env: { account, region: primaryRegion },
  crossRegionReferences: true,
  borsoFrCert: certs.borsoFrCert,
  previewCert: certs.previewCert,
});
