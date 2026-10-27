/**
 * @vitest-environment node
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DsqlClusterStack } from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildPragmaAppStack } from '../lib/stack.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(HERE, '..', '..');
const FAKE_ASSETS_DIR = path.join(WORKSPACE_ROOT, 'site');
const FAKE_API_ENTRY = path.join(WORKSPACE_ROOT, 'api', 'src', 'main.ts');
const FAKE_MIGRATIONS_DIR = path.join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations');
const PREVIEW_PR_NUMBER = 1;
const PROD_ERROR_REPORTING = {
  dsn: 'https://public-key@o1.ingest.de.sentry.io/2',
  release: '0123abcd',
};

const SYNTH_WARMUP_TIMEOUT_MILLISECONDS = 300_000;

const templateByStage = new Map<string, Template>();

const policyStatementSchema = z.object({
  Properties: z.object({
    PolicyDocument: z.object({
      Statement: z.array(z.object({ Action: z.unknown(), Resource: z.unknown() })),
    }),
  }),
});

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
    ...(stage === 'prod' ? { errorReporting: PROD_ERROR_REPORTING } : {}),
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

function readParameterReadGrant(stage: 'prod' | 'preview'): string {
  const policies = synthAppStack(stage).findResources('AWS::IAM::Policy');
  const statements = Object.values(policies).flatMap(
    (policy) => policyStatementSchema.parse(policy).Properties.PolicyDocument.Statement,
  );
  const grants = statements.filter((statement) => statement.Action === 'ssm:GetParameter');
  expect(grants).toHaveLength(1);
  return JSON.stringify(grants[0]?.Resource);
}

function readApiVariables(stage: 'prod' | 'preview'): Record<string, unknown> {
  const functions = synthAppStack(stage).findResources('AWS::Lambda::Function');
  const apiFunction = Object.entries(functions).find(([logicalId]) =>
    logicalId.includes('AppApiFn'),
  )?.[1];
  return apiFunction === undefined ? {} : readEnvVars(apiFunction);
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

function readSchemaReaderBlocklist(template: Template): unknown {
  for (const resource of Object.values(
    template.findResources('AWS::CloudFormation::CustomResource'),
  )) {
    const properties: unknown = resource.Properties;
    if (typeof properties !== 'object' || properties === null) continue;
    if (!('readerTableBlocklist' in properties)) continue;
    return properties.readerTableBlocklist;
  }
  return undefined;
}

function readSchemaReader(template: Template): unknown {
  for (const resource of Object.values(
    template.findResources('AWS::CloudFormation::CustomResource'),
  )) {
    const properties: unknown = resource.Properties;
    if (typeof properties !== 'object' || properties === null) continue;
    if (!('readerPrincipalArns' in properties)) continue;
    return properties.readerPrincipalArns;
  }
  return undefined;
}

describe('pragma read-only agent access (ADR-0044)', () => {
  beforeAll(() => {
    synthAppStack('prod');
    synthAppStack('preview');
  }, SYNTH_WARMUP_TIMEOUT_MILLISECONDS);

  it('maps the AI-Dev-ReadOnly user to a SELECT-only role on prod', () => {
    expect(JSON.stringify(readSchemaReader(synthAppStack('prod')))).toContain(
      ':iam::123456789012:user/AI-Dev-ReadOnly',
    );
  });

  it('keeps the reader off every table holding a credential, a key, a secret address or a ballot token', () => {
    expect(readSchemaReaderBlocklist(synthAppStack('prod'))).toStrictEqual([
      'app_config',
      'member_credential',
      'auth_attempt',
      'member_calendar_feed',
      'member_passkey',
      'push_subscription',
      'vapid_key_pair',
      'webauthn_challenge',
      'audience_suggestion',
      'audience_vote',
    ]);
  });

  it('maps no reader on a preview, which holds a copy of prod and nothing more', () => {
    expect(readSchemaReader(synthAppStack('preview'))).toBeUndefined();
  });
});

describe('pragma preview schema cloning', () => {
  beforeAll(() => {
    synthAppStack('prod');
    synthAppStack('preview');
  }, SYNTH_WARMUP_TIMEOUT_MILLISECONDS);

  it('never clones on prod, where source and target would be the same schema', () => {
    expect(readSchemaCloneConfig(synthAppStack('prod'))).toBeUndefined();
  });

  it('clones prod into a preview with its passwords, but no passkey, no avatar key, no push subscription or key pair, and no take', () => {
    expect(readSchemaCloneConfig(synthAppStack('preview'))).toEqual({
      sourceSchemaName: 'prod',
      tableBlocklist: [
        'auth_attempt',
        'member_calendar_feed',
        'member_passkey',
        'push_subscription',
        'vapid_key_pair',
        'webauthn_challenge',
        'take',
        'take_comment',
      ],
      tablesToReplace: ['app_config', 'member_credential'],
      columnsToNullify: { member: ['avatar_s3_key'] },
    });
  });
});

describe('pragma app stack', () => {
  it('gives the API 20 seconds, enough to read every calendar feed in turn', () => {
    synthAppStack('prod').hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: Match.stringLikeRegexp('api'),
      Timeout: 20,
    });
  });

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

  it('passes the relying party of the stage a passkey is enrolled on', () => {
    const expectedOrigins = {
      preview: 'https://pragma-pr-1.preview.borso.fr',
      prod: 'https://pragma.borso.fr',
    };
    for (const stage of ['prod', 'preview'] as const) {
      const template = synthAppStack(stage);
      const functions = template.findResources('AWS::Lambda::Function');
      const apiFunction = Object.entries(functions).find(([logicalId]) =>
        logicalId.includes('AppApiFn'),
      )?.[1];
      const variables = apiFunction === undefined ? {} : readEnvVars(apiFunction);
      const expectedOrigin = expectedOrigins[stage];
      expect(variables.WEBAUTHN_ORIGIN).toBe(expectedOrigin);
      expect(variables.WEBAUTHN_RELYING_PARTY_ID).toBe(new URL(expectedOrigin).hostname);
    }
  });

  it('names the Spotify parameter and grants the API permission to read it', () => {
    expect(readApiVariables('prod').SPOTIFY_CREDENTIALS_PARAMETER).toBe(
      '/pragma/spotify-credentials',
    );
    expect(readParameterReadGrant('prod')).toContain(':parameter/pragma/spotify-credentials');
  });

  it('grants reading exactly the Spotify parameter, and names no VAPID parameter', () => {
    for (const stage of ['prod', 'preview'] as const) {
      const grant = readParameterReadGrant(stage);
      expect(grant.match(/:parameter\//g)).toHaveLength(1);
      expect(grant).not.toContain('vapid');
      expect(Object.keys(readApiVariables(stage)).join()).not.toContain('VAPID');
    }
    expect(synthAppStack('prod').findResources('AWS::SSM::Parameter')).toEqual({});
  });

  it('lets the API delete objects from the uploads bucket, so a deleted song takes its audio with it', () => {
    synthAppStack('prod').hasResourceProperties(
      'AWS::IAM::Policy',
      Match.objectLike({
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['s3:DeleteObject*']),
              Effect: 'Allow',
            }),
          ]),
        }),
      }),
    );
  });

  it('keeps the Spotify secret itself out of the synthesized template', () => {
    const rendered = JSON.stringify(synthAppStack('prod').toJSON());
    expect(rendered).not.toContain('SPOTIFY_CREDENTIALS"');
    expect(rendered).toContain('/pragma/spotify-credentials');
  });

  it('hands the error reporting project and release to the API only when one is configured', () => {
    expect(readApiVariables('prod')).toMatchObject({
      SENTRY_DSN: PROD_ERROR_REPORTING.dsn,
      SENTRY_RELEASE: PROD_ERROR_REPORTING.release,
      NODE_OPTIONS: '--enable-source-maps',
    });
    expect(readApiVariables('preview')).not.toHaveProperty('SENTRY_DSN');
    expect(readApiVariables('preview')).not.toHaveProperty('SENTRY_RELEASE');
    expect(readApiVariables('preview')).not.toHaveProperty('NODE_OPTIONS');
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
