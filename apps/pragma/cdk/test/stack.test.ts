/**
 * @vitest-environment node
 *
 * CDK synth audit for the pragma stack. The non-trivial assertions:
 *
 * 1. No `AWS::SecretsManager::Secret` resources — per ADR-0004 the
 *    shared password hash + HMAC signing key live in the application
 *    DB row `pragma.app_config`, not in Secrets Manager.
 * 2. The uploads bucket carries the expected name shape per stage,
 *    blocks all public access, and exposes the GET/PUT CORS pair the
 *    front-end relies on.
 * 3. The API Lambda receives `UPLOADS_BUCKET` as an env var on every
 *    stage and `ALLOW_TEST_SEED='1'` only on non-prod stages (the flag
 *    is injected by `PreviewableApp`, shared across every app).
 * 4. The prod stack carries the `pragma.borso.fr` CloudFront alias.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DsqlClusterStack } from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { buildPragmaAppStack } from '../lib/stack.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(HERE, '..', '..');
const FAKE_ASSETS_DIR = path.join(WORKSPACE_ROOT, 'site');
const FAKE_API_ENTRY = path.join(WORKSPACE_ROOT, 'api', 'src', 'main.ts');
const FAKE_MIGRATIONS_DIR = path.join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations');
const PREVIEW_PR_NUMBER = 1;

// @FollowsBlueprint test-cdk-synth
function synthAppStack(stage: 'prod' | 'preview'): Template {
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
  // This stack copies production rows — real members, songs, setlists — into
  // every preview, and a preview URL is public. These two assertions are the
  // guard rails on that decision: prod must never clone (a self-clone would be
  // destructive), and the exclusions must not silently shrink.
  it('never clones on prod', () => {
    expect(readSchemaCloneConfig(synthAppStack('prod'))).toBeUndefined();
  });

  it('clones prod into a preview, minus rate-limit state, with avatar keys nulled', () => {
    expect(readSchemaCloneConfig(synthAppStack('preview'))).toEqual({
      sourceSchemaName: 'prod',
      // `app_config` is deliberately absent from this list: the preview is
      // protected by production's own password, which is the only credential
      // that is neither hard-coded in a public repository nor in need of
      // distribution. Adding it here would lock every preview out.
      tableBlocklist: ['auth_attempt'],
      // Prod's uploads bucket is a different bucket; a cloned key would 404.
      columnsToNullify: { member: ['avatar_s3_key'] },
      // Without this the clone's ON CONFLICT DO NOTHING concedes to whatever
      // row id=1 the schema already had — which on a schema bootstrapped by
      // the old fixture meant real production data behind the fixture's
      // published password.
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
