/**
 * @vitest-environment node
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DsqlClusterStack } from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildBananaRushAppStack } from '../lib/stack.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(HERE, '..', '..');
const FAKE_ASSETS_DIR = path.join(WORKSPACE_ROOT, 'site');
const API_ENTRY = path.join(WORKSPACE_ROOT, 'api', 'src', 'main.ts');
const WEBSOCKET_ENTRY = path.join(WORKSPACE_ROOT, 'api', 'src', 'main.websocket.ts');
const MIGRATIONS_DIR = path.join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations');
const PREVIEW_PR_NUMBER = 1;
const PROD_DOMAIN = 'banana-rush.borso.fr';

const SYNTH_WARMUP_TIMEOUT_MILLISECONDS = 300_000;

const API_FUNCTION_LOGICAL_ID_FRAGMENT = 'AppApiFn';
const WEBSOCKET_FUNCTION_LOGICAL_ID_FRAGMENT = 'RealtimeFn';
const MANAGE_CONNECTIONS_ACTION = 'execute-api:ManageConnections';
const DSQL_CONNECT_ACTION = 'dsql:DbConnectAdmin';

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
  const clusterStack = new DsqlClusterStack(app, 'banana-rush-cluster', {
    app: 'banana-rush',
    env,
  });
  const stack = new Stack(app, stage === 'prod' ? 'banana-rush-prod' : 'banana-rush-pr-1', { env });
  buildBananaRushAppStack({
    scope: stack,
    stage,
    ...(stage === 'preview' ? { prNumber: PREVIEW_PR_NUMBER } : {}),
    domainName: stage === 'prod' ? PROD_DOMAIN : undefined,
    assetsPath: FAKE_ASSETS_DIR,
    apiEntry: API_ENTRY,
    websocketEntry: WEBSOCKET_ENTRY,
    migrationsPath: MIGRATIONS_DIR,
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

function readFunctionEnvVars(
  template: Template,
  logicalIdFragment: string,
): Record<string, unknown> {
  const functions = template.findResources('AWS::Lambda::Function');
  const found = Object.entries(functions).find(([logicalId]) =>
    logicalId.includes(logicalIdFragment),
  )?.[1];
  expect(found, `no function matching ${logicalIdFragment}`).toBeDefined();
  return found === undefined ? {} : readEnvVars(found);
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

describe('banana-rush app stack', () => {
  beforeAll(() => {
    synthAppStack('prod');
    synthAppStack('preview');
  }, SYNTH_WARMUP_TIMEOUT_MILLISECONDS);

  it('owns no bucket beyond the one the site is served from — a game holds no uploaded file', () => {
    const prodTemplate = synthAppStack('prod');
    expect(Object.values(prodTemplate.findResources('AWS::S3::Bucket'))).toHaveLength(1);
    prodTemplate.hasResourceProperties(
      'AWS::S3::Bucket',
      Match.objectLike({ BucketName: 'banana-rush-prod' }),
    );
    expect(synthAppStack('preview').findResources('AWS::S3::Bucket')).toEqual({});
  });

  it('starts a preview schema empty rather than cloning production', () => {
    for (const stage of ['prod', 'preview'] as const) {
      expect(readSchemaCloneConfig(synthAppStack(stage))).toBeUndefined();
    }
  });

  it('declares no Secrets Manager resources', () => {
    for (const stage of ['prod', 'preview'] as const) {
      expect(synthAppStack(stage).findResources('AWS::SecretsManager::Secret')).toEqual({});
    }
  });

  it('declares one WebSocket API per stage, named after the stage', () => {
    const expectedNames = {
      prod: 'banana-rush-prod-websocket',
      preview: 'banana-rush-preview-websocket',
    };
    for (const stage of ['prod', 'preview'] as const) {
      synthAppStack(stage).hasResourceProperties(
        'AWS::ApiGatewayV2::Api',
        Match.objectLike({ Name: expectedNames[stage], ProtocolType: 'WEBSOCKET' }),
      );
    }
  });

  it('names the WebSocket stage after the pull request on a preview', () => {
    synthAppStack('preview').hasResourceProperties(
      'AWS::ApiGatewayV2::Stage',
      Match.objectLike({ StageName: 'preview-pr-1' }),
    );
    synthAppStack('prod').hasResourceProperties(
      'AWS::ApiGatewayV2::Stage',
      Match.objectLike({ StageName: 'prod' }),
    );
  });

  it('hands the HTTP API both channel addresses, the one it posts to and the one it advertises', () => {
    for (const stage of ['prod', 'preview'] as const) {
      const variables = readFunctionEnvVars(synthAppStack(stage), API_FUNCTION_LOGICAL_ID_FRAGMENT);
      expect(variables).toHaveProperty('WEBSOCKET_CALLBACK_URL');
      expect(variables).toHaveProperty('WEBSOCKET_CLIENT_URL');
    }
  });

  it('gives the WebSocket handler the database it writes a connection row into', () => {
    for (const stage of ['prod', 'preview'] as const) {
      const variables = readFunctionEnvVars(
        synthAppStack(stage),
        WEBSOCKET_FUNCTION_LOGICAL_ID_FRAGMENT,
      );
      expect(variables).toHaveProperty('DSQL_ENDPOINT');
      expect(variables.DSQL_SCHEMA).toBe(stage === 'prod' ? 'prod' : 'pr_1');
    }
  });

  it('lets the HTTP API manage connections, because broadcasting is its job and not the socket handler’s', () => {
    synthAppStack('prod').hasResourceProperties(
      'AWS::IAM::Policy',
      Match.objectLike({
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: MANAGE_CONNECTIONS_ACTION,
              Effect: 'Allow',
            }),
          ]),
        }),
      }),
    );
  });

  it('grants the WebSocket handler its own connection to the cluster', () => {
    const template = synthAppStack('prod');
    const policies = template.findResources('AWS::IAM::Policy');
    const grantedRoleReferences = Object.values(policies).flatMap((policy) => {
      const variables: unknown = policy.Properties;
      if (typeof variables !== 'object' || variables === null) return [];
      if (!('PolicyDocument' in variables) || !('Roles' in variables)) return [];
      const rendered = JSON.stringify(variables.PolicyDocument);
      return rendered.includes(DSQL_CONNECT_ACTION) ? [JSON.stringify(variables.Roles)] : [];
    });
    expect(
      grantedRoleReferences.some((reference) =>
        reference.includes(WEBSOCKET_FUNCTION_LOGICAL_ID_FRAGMENT),
      ),
    ).toBe(true);
  });

  it('declares the custom prod domain alias on the CloudFront distribution', () => {
    synthAppStack('prod').hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({ Aliases: Match.arrayWith([PROD_DOMAIN]) }),
      }),
    );
  });
});
