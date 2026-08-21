/**
 * @vitest-environment node
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DsqlClusterStack } from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildPragmaAppStack } from '../lib/stack.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(HERE, '..', '..');
const FAKE_ASSETS_DIR = path.join(WORKSPACE_ROOT, 'site');
const FAKE_API_ENTRY = path.join(WORKSPACE_ROOT, 'api', 'src', 'main.ts');
const FAKE_MIGRATIONS_DIR = path.join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations');
const PREVIEW_PR_NUMBER = 1;

const SYNTH_WARMUP_TIMEOUT_MILLISECONDS = 300_000;

const templateByStage = new Map<string, Template>();

// @FollowsBlueprint test-cdk-synth
function synthAppStack(stage: 'prod' | 'preview'): Template {
  const cached = templateByStage.get(stage);
  if (cached !== undefined) return cached;
  const synthesized = buildAppStackTemplate(stage);
  templateByStage.set(stage, synthesized);
  return synthesized;
}

function buildAppStackTemplate(stage: 'prod' | 'preview'): Template {
  const app = new App();
  const env = { account: '123456789012', region: 'eu-west-3' };
  const clusterStack = new DsqlClusterStack(app, 'pragma-cluster', {
    app: 'pragma',
    env,
  });
  const stack = new Stack(app, stage === 'prod' ? 'pragma-prod' : 'pragma-pr-1', { env });
  buildPragmaAppStack({
    scope: stack,
    stage,
    ...(stage === 'preview' ? { prNumber: PREVIEW_PR_NUMBER } : {}),
    domainName: stage === 'prod' ? 'pragma.borso.fr' : undefined,
    assetsPath: FAKE_ASSETS_DIR,
    apiEntry: FAKE_API_ENTRY,
    migrationsPath: FAKE_MIGRATIONS_DIR,
    cluster: clusterStack.cluster,
  });
  return Template.fromStack(stack);
}

function readEnvVars(resource: { readonly Properties?: unknown }): Record<string, unknown> {
  const properties = resource.Properties;
  if (typeof properties !== 'object' || properties === null) return {};
  if (!('Environment' in properties)) return {};
  const environment = properties.Environment;
  if (typeof environment !== 'object' || environment === null) return {};
  if (!('Variables' in environment)) return {};
  const variables = environment.Variables;
  return typeof variables === 'object' && variables !== null ? { ...variables } : {};
}

function readSchemaCloneConfig(template: Template): unknown {
  for (const resource of Object.values(
    template.findResources('AWS::CloudFormation::CustomResource'),
  )) {
    const properties: unknown = resource.Properties;
    if (typeof properties !== 'object' || properties === null) continue;
    if (!('cloneFromSchema' in properties)) continue;
    return properties.cloneFromSchema;
  }
  return undefined;
}

describe('pragma preview schema cloning', () => {
  beforeAll(() => {
    synthAppStack('prod');
    synthAppStack('preview');
  }, SYNTH_WARMUP_TIMEOUT_MILLISECONDS);

  it('never clones on prod, where source and target would be the same schema', () => {
    expect(readSchemaCloneConfig(synthAppStack('prod'))).toBeUndefined();
  });

  it('clones prod into a preview, replacing app_config so the production password gates the preview, dropping rate-limit state and nulling avatar keys', () => {
    expect(readSchemaCloneConfig(synthAppStack('preview'))).toEqual({
      sourceSchemaName: 'prod',
      tableBlocklist: ['auth_attempt'],
      columnsToNullify: { member: ['avatar_s3_key'] },
      tablesToReplace: ['app_config'],
    });
  });
});

describe('pragma app stack', () => {
  it('declares no Secrets Manager resources — auth state lives in the DB (ADR-0004)', () => {
    for (const stage of ['prod', 'preview'] as const) {
      const template = synthAppStack(stage);
      expect(template.findResources('AWS::SecretsManager::Secret')).toEqual({});
    }
  });

  it('declares the uploads bucket with the expected name on prod', () => {
    const prodTemplate = synthAppStack('prod');
    prodTemplate.hasResourceProperties(
      'AWS::S3::Bucket',
      Match.objectLike({ BucketName: 'pragma-prod-uploads' }),
    );
  });

  it('declares the uploads bucket with the PR suffix on preview', () => {
    const previewTemplate = synthAppStack('preview');
    previewTemplate.hasResourceProperties(
      'AWS::S3::Bucket',
      Match.objectLike({ BucketName: 'pragma-preview-uploads-1' }),
    );
  });

  it('blocks all public access on the uploads bucket', () => {
    const prodTemplate = synthAppStack('prod');
    prodTemplate.hasResourceProperties(
      'AWS::S3::Bucket',
      Match.objectLike({
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      }),
    );
  });

  it('exposes the GET/PUT CORS pair the front-end uses to upload chart variants', () => {
    const prodTemplate = synthAppStack('prod');
    prodTemplate.hasResourceProperties(
      'AWS::S3::Bucket',
      Match.objectLike({
        BucketName: 'pragma-prod-uploads',
        CorsConfiguration: Match.objectLike({
          CorsRules: Match.arrayWith([
            Match.objectLike({
              AllowedMethods: ['PUT', 'GET'],
            }),
          ]),
        }),
      }),
    );
  });

  it('mounts the test-seed flag only on non-prod stacks', () => {
    const prodFunctions = synthAppStack('prod').findResources('AWS::Lambda::Function');
    for (const lambdaFunction of Object.values(prodFunctions)) {
      expect(readEnvVars(lambdaFunction)).not.toHaveProperty('ALLOW_TEST_SEED');
    }
    const previewFunctions = synthAppStack('preview').findResources('AWS::Lambda::Function');
    const flagged = Object.values(previewFunctions).filter(
      (lambdaFunction) => 'ALLOW_TEST_SEED' in readEnvVars(lambdaFunction),
    );
    expect(flagged.length).toBeGreaterThan(0);
  });

  it('injects UPLOADS_BUCKET on the API Lambda for every stage', () => {
    for (const stage of ['prod', 'preview'] as const) {
      const template = synthAppStack(stage);
      const functions = template.findResources('AWS::Lambda::Function');
      const apiFunction = Object.entries(functions).find(([logicalId]) =>
        logicalId.includes('AppApiFn'),
      )?.[1];
      expect(apiFunction, `api function not found in ${stage} template`).toBeDefined();
      const variables = apiFunction === undefined ? {} : readEnvVars(apiFunction);
      expect(variables).toHaveProperty('UPLOADS_BUCKET');
    }
  });

  it('declares the custom prod domain alias on the CloudFront distribution', () => {
    const prodTemplate = synthAppStack('prod');
    prodTemplate.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          Aliases: Match.arrayWith(['pragma.borso.fr']),
        }),
      }),
    );
  });
});
