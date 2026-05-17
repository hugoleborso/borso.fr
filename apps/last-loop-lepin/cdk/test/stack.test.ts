/**
 * @vitest-environment node
 *
 * CDK synth audit. Two assertions matter most:
 *
 * 1. The Lambda's env vars include `LASTLOOP_ALLOW_TEST_SEED='1'` on
 *    preview stacks and DO NOT include it on the prod stack. The
 *    `/api/__test/seed` endpoint is mounted only when that flag is
 *    set — leaving it on in prod would expose seeding to the public.
 *
 * 2. The prod stack receives the custom domain alias; preview stacks
 *    fall back to the auto-generated `*.preview.borso.fr` host.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DsqlClusterStack } from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { buildLastLoopLepinAppStack } from '../lib/stack.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(HERE, '..', '..');
const FAKE_ASSETS_DIR = path.join(WORKSPACE_ROOT, 'site');
const FAKE_API_ENTRY = path.join(WORKSPACE_ROOT, 'api', 'src', 'main.ts');
const FAKE_MIGRATIONS_DIR = path.join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations');

function synthAppStack(stage: 'prod' | 'preview'): Template {
  const app = new App();
  const env = { account: '123456789012', region: 'eu-west-3' };
  const clusterStack = new DsqlClusterStack(app, 'last-loop-lepin-cluster', { app: 'last-loop-lepin', env });
  const stack = new Stack(app, stage === 'prod' ? 'last-loop-lepin-prod' : 'last-loop-lepin-pr-1', { env });
  buildLastLoopLepinAppStack({
    scope: stack,
    stage,
    prNumber: stage === 'preview' ? 1 : undefined,
    domainName: stage === 'prod' ? 'last-loop-lepin.borso.fr' : undefined,
    assetsPath: FAKE_ASSETS_DIR,
    apiEntry: FAKE_API_ENTRY,
    migrationsPath: FAKE_MIGRATIONS_DIR,
    cluster: clusterStack.cluster,
  });
  return Template.fromStack(stack);
}

describe('last-loop-lepin app stack', () => {
  it('mounts the test-seed endpoint flag only on non-prod stacks', () => {
    const readEnvVars = (resource: { readonly Properties?: unknown }): Record<string, unknown> => {
      const properties = resource.Properties;
      if (typeof properties !== 'object' || properties === null) return {};
      if (!('Environment' in properties)) return {};
      const environment = properties.Environment;
      if (typeof environment !== 'object' || environment === null) return {};
      if (!('Variables' in environment)) return {};
      const variables = environment.Variables;
      return typeof variables === 'object' && variables !== null ? { ...variables } : {};
    };

    const prodTemplate = synthAppStack('prod');
    const previewTemplate = synthAppStack('preview');

    const prodFunctions = prodTemplate.findResources('AWS::Lambda::Function');
    for (const fn of Object.values(prodFunctions)) {
      expect(readEnvVars(fn)).not.toHaveProperty('LASTLOOP_ALLOW_TEST_SEED');
    }

    const previewFunctions = previewTemplate.findResources('AWS::Lambda::Function');
    const flaggedFunctions = Object.values(previewFunctions).filter(
      (fn) => 'LASTLOOP_ALLOW_TEST_SEED' in readEnvVars(fn),
    );
    expect(flaggedFunctions.length).toBeGreaterThan(0);
  });

  it('declares the photos S3 bucket with the expected name shape', () => {
    const prodTemplate = synthAppStack('prod');
    prodTemplate.hasResourceProperties(
      'AWS::S3::Bucket',
      Match.objectLike({ BucketName: 'last-loop-lepin-prod-photos' }),
    );
  });

  it('drops PIN_HASH and JWT_SECRET env vars — admin auth lives in the DB now', () => {
    const readEnvVars = (resource: { readonly Properties?: unknown }): Record<string, unknown> => {
      const properties = resource.Properties;
      if (typeof properties !== 'object' || properties === null) return {};
      if (!('Environment' in properties)) return {};
      const environment = properties.Environment;
      if (typeof environment !== 'object' || environment === null) return {};
      if (!('Variables' in environment)) return {};
      const variables = environment.Variables;
      return typeof variables === 'object' && variables !== null ? { ...variables } : {};
    };

    for (const stage of ['prod', 'preview'] as const) {
      const template = synthAppStack(stage);
      const functions = template.findResources('AWS::Lambda::Function');
      const apiFn = Object.entries(functions).find(([logicalId]) =>
        /AppApiFn/.test(logicalId),
      )?.[1];
      expect(apiFn, `api function not found in ${stage} template`).toBeDefined();
      const variables = apiFn === undefined ? {} : readEnvVars(apiFn);
      expect(variables).not.toHaveProperty('PIN_HASH');
      expect(variables).not.toHaveProperty('JWT_SECRET');
    }

    // And no AWS::SecretsManager::Secret resource is provisioned anymore.
    for (const stage of ['prod', 'preview'] as const) {
      synthAppStack(stage).resourceCountIs('AWS::SecretsManager::Secret', 0);
    }
  });

  it('injects ALLOWED_ORIGIN on the API Lambda — prod=apex, preview=per-PR host', () => {
    const readEnvVars = (resource: { readonly Properties?: unknown }): Record<string, unknown> => {
      const properties = resource.Properties;
      if (typeof properties !== 'object' || properties === null) return {};
      if (!('Environment' in properties)) return {};
      const environment = properties.Environment;
      if (typeof environment !== 'object' || environment === null) return {};
      if (!('Variables' in environment)) return {};
      const variables = environment.Variables;
      return typeof variables === 'object' && variables !== null ? { ...variables } : {};
    };

    const prodVars = (() => {
      const fn = Object.entries(synthAppStack('prod').findResources('AWS::Lambda::Function')).find(
        ([logicalId]) => /AppApiFn/.test(logicalId),
      )?.[1];
      return fn === undefined ? {} : readEnvVars(fn);
    })();
    expect(prodVars.ALLOWED_ORIGIN).toBe('https://last-loop-lepin.borso.fr');

    const previewVars = (() => {
      const fn = Object.entries(
        synthAppStack('preview').findResources('AWS::Lambda::Function'),
      ).find(([logicalId]) => /AppApiFn/.test(logicalId))?.[1];
      return fn === undefined ? {} : readEnvVars(fn);
    })();
    expect(previewVars.ALLOWED_ORIGIN).toBe('https://last-loop-lepin-pr-1.preview.borso.fr');
  });

  it('uses the custom prod domain for the cloudfront distribution', () => {
    const prodTemplate = synthAppStack('prod');
    prodTemplate.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          Aliases: Match.arrayWith(['last-loop-lepin.borso.fr']),
        }),
      }),
    );
  });

  it('provisions a PhotosCdn distribution on prod (photos-cdn.borso.fr)', () => {
    const prodTemplate = synthAppStack('prod');
    prodTemplate.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          Aliases: ['photos-cdn.borso.fr'],
        }),
      }),
    );
  });

  it('provisions a per-PR PhotosCdn distribution on preview', () => {
    const previewTemplate = synthAppStack('preview');
    previewTemplate.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          Aliases: ['last-loop-lepin-pr-1-photos.preview.borso.fr'],
        }),
      }),
    );
  });

  it('injects PHOTOS_CDN_HOST env var on the API Lambda for every stage', () => {
    const readEnvVars = (resource: { readonly Properties?: unknown }): Record<string, unknown> => {
      const properties = resource.Properties;
      if (typeof properties !== 'object' || properties === null) return {};
      if (!('Environment' in properties)) return {};
      const environment = properties.Environment;
      if (typeof environment !== 'object' || environment === null) return {};
      if (!('Variables' in environment)) return {};
      const variables = environment.Variables;
      return typeof variables === 'object' && variables !== null ? { ...variables } : {};
    };

    for (const stage of ['prod', 'preview'] as const) {
      const template = synthAppStack(stage);
      const functions = template.findResources('AWS::Lambda::Function');
      const apiFn = Object.entries(functions).find(([logicalId]) =>
        /AppApiFn/.test(logicalId),
      )?.[1];
      expect(apiFn, `api function not found in ${stage} template`).toBeDefined();
      const variables = apiFn === undefined ? {} : readEnvVars(apiFn);
      expect(variables).toHaveProperty('PHOTOS_CDN_HOST');
    }
  });
});
