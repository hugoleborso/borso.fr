/**
 * @vitest-environment node
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DsqlClusterStack } from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildBorsouverturesAppStack } from '../lib/stack.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(HERE, '..', '..');
const FAKE_ASSETS_DIR = path.join(WORKSPACE_ROOT, 'site');
const API_ENTRY = path.join(WORKSPACE_ROOT, 'api', 'src', 'main.ts');
const MIGRATIONS_DIR = path.join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations');
const PREVIEW_PR_NUMBER = 1;
const PROD_DOMAIN = 'borsouvertures.borso.fr';
const PROD_ERROR_REPORTING = {
  dsn: 'https://public-key@o1.ingest.de.sentry.io/2',
  release: '0123abcd',
};

const SYNTH_WARMUP_TIMEOUT_MILLISECONDS = 300_000;
const TEST_SEED_FLAG = 'ALLOW_TEST_SEED';
const API_FUNCTION_LOGICAL_ID_FRAGMENT = 'ApiFn';

const STATIC_SITE_PROD_LOGICAL_IDS = [
  'SiteBucket978D4AEB',
  'SiteBucketPolicy45F6EBA1',
  'SiteBucketAutoDeleteObjectsCustomResource6B1A5EC1',
  'SiteDistribution390DED28',
  'SiteDistributionOrigin1S3OriginAccessControl4F95283E',
  'SiteIndexRewriteFunctionF0A2C775',
  'SiteAliasA5601B07F',
  'SiteAliasAAAAD7B32221',
  'SiteDeployAwsCliLayer25DE262D',
  'SiteDeployCustomResource512MiB75AAA18F',
  'SiteDeployFingerprintedAssetsAwsCliLayer4527917E',
  'SiteDeployFingerprintedAssetsCustomResource512MiB78E33AD5',
  'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C512MiB6723FB92',
  'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C512MiBServiceRoleBA21DBC1',
  'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C512MiBServiceRoleDefaultPolicy96C3E726',
  'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
  'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092',
];

const SECRET_TABLES = ['operator_credential', 'app_config', 'sign_in_attempt'];

type DeployStage = 'prod' | 'preview';

const templateByStage = new Map<DeployStage, Template>();

// @FollowsBlueprint test-cdk-synth
function synthAppStack(stage: DeployStage): Template {
  const cached = templateByStage.get(stage);
  if (cached !== undefined) return cached;
  const synthesized = buildAppStackTemplate(stage);
  templateByStage.set(stage, synthesized);
  return synthesized;
}

function buildAppStackTemplate(stage: DeployStage): Template {
  const app = new App();
  const env = { account: '123456789012', region: 'eu-west-3' };
  const clusterStack = new DsqlClusterStack(app, 'borsouvertures-cluster', {
    app: 'borsouvertures',
    env,
  });
  const stack = new Stack(
    app,
    stage === 'prod' ? 'borsouvertures-prod' : `borsouvertures-pr-${PREVIEW_PR_NUMBER}`,
    { env },
  );
  buildBorsouverturesAppStack({
    scope: stack,
    stage,
    ...(stage === 'preview' ? { prNumber: PREVIEW_PR_NUMBER } : {}),
    domainName: stage === 'prod' ? PROD_DOMAIN : undefined,
    assetsPath: FAKE_ASSETS_DIR,
    apiEntry: API_ENTRY,
    migrationsPath: MIGRATIONS_DIR,
    cluster: clusterStack.cluster,
    ...(stage === 'prod' ? { errorReporting: PROD_ERROR_REPORTING } : {}),
  });
  return Template.fromStack(stack);
}

function readLogicalIds(template: Template): readonly string[] {
  const rendered: unknown = template.toJSON();
  if (typeof rendered !== 'object' || rendered === null) return [];
  if (!('Resources' in rendered)) return [];
  const resources = rendered.Resources;
  return typeof resources === 'object' && resources !== null ? Object.keys(resources) : [];
}

function readSchemaProperty(template: Template, propertyName: string): unknown {
  for (const resource of Object.values(
    template.findResources('AWS::CloudFormation::CustomResource'),
  )) {
    const properties: unknown = resource.Properties;
    if (typeof properties !== 'object' || properties === null) continue;
    if (!(propertyName in properties)) continue;
    return Object.entries(properties).find(([name]) => name === propertyName)?.[1];
  }
  return undefined;
}

function readApiEnvironment(template: Template): Record<string, unknown> {
  const found = Object.entries(template.findResources('AWS::Lambda::Function')).find(
    ([logicalId]) => logicalId.includes(API_FUNCTION_LOGICAL_ID_FRAGMENT),
  )?.[1];
  expect(found, `no function matching ${API_FUNCTION_LOGICAL_ID_FRAGMENT}`).toBeDefined();
  const properties: unknown = found?.Properties;
  if (typeof properties !== 'object' || properties === null) return {};
  if (!('Environment' in properties)) return {};
  const environment = properties.Environment;
  if (typeof environment !== 'object' || environment === null) return {};
  if (!('Variables' in environment)) return {};
  const variables = environment.Variables;
  return typeof variables === 'object' && variables !== null ? { ...variables } : {};
}

describe('borsouvertures app stack', () => {
  beforeAll(() => {
    synthAppStack('prod');
    synthAppStack('preview');
  }, SYNTH_WARMUP_TIMEOUT_MILLISECONDS);

  it('keeps the 17 logical ids the static site had on prod, so CloudFormation updates the bucket and the distribution in place', () => {
    expect(readLogicalIds(synthAppStack('prod'))).toEqual(
      expect.arrayContaining(STATIC_SITE_PROD_LOGICAL_IDS),
    );
  });

  it('mounts the test seed on a preview and never on prod, where the fixture password would open the account', () => {
    expect(readApiEnvironment(synthAppStack('prod'))).not.toHaveProperty(TEST_SEED_FLAG);
    expect(JSON.stringify(synthAppStack('prod').toJSON())).not.toContain(TEST_SEED_FLAG);
    expect(readApiEnvironment(synthAppStack('preview'))).toMatchObject({ [TEST_SEED_FLAG]: '1' });
  });

  it('clones nothing from prod into a preview, whose fixture password is public', () => {
    for (const stage of ['prod', 'preview'] as const) {
      expect(readSchemaProperty(synthAppStack(stage), 'cloneFromSchema')).toBeUndefined();
    }
  });

  it('hides the credential, the signing key and the sign-in attempts from the prod reader', () => {
    expect(readSchemaProperty(synthAppStack('prod'), 'readerTableBlocklist')).toEqual(
      SECRET_TABLES,
    );
    expect(
      JSON.stringify(readSchemaProperty(synthAppStack('prod'), 'readerPrincipalArns')),
    ).toContain(':iam::123456789012:user/AI-Dev-ReadOnly');
  });

  it('maps no reader on a preview', () => {
    expect(readSchemaProperty(synthAppStack('preview'), 'readerPrincipalArns')).toBeUndefined();
  });

  it('hands the API the error reporting project and release when one is configured, and none otherwise', () => {
    expect(readApiEnvironment(synthAppStack('prod'))).toMatchObject({
      SENTRY_DSN: PROD_ERROR_REPORTING.dsn,
      SENTRY_RELEASE: PROD_ERROR_REPORTING.release,
    });
    expect(readApiEnvironment(synthAppStack('preview'))).not.toHaveProperty('SENTRY_DSN');
  });
});
