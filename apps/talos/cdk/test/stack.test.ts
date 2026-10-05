/**
 * @vitest-environment node
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DsqlClusterStack } from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildTalosAppStack } from '../lib/stack.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(HERE, '..', '..');
const SYNTH_WARMUP_TIMEOUT_MILLISECONDS = 300_000;

const synthesizedTemplates = new Map<'prod', Template>();

// @FollowsBlueprint test-cdk-synth
function synthAppStack(): Template {
  const cached = synthesizedTemplates.get('prod');
  if (cached !== undefined) return cached;
  const synthesized = buildAppStackTemplate();
  synthesizedTemplates.set('prod', synthesized);
  return synthesized;
}

function buildAppStackTemplate(): Template {
  const app = new App();
  const env = { account: '123456789012', region: 'eu-west-3' };
  const clusterStack = new DsqlClusterStack(app, 'talos-cluster', { app: 'talos', env });
  const stack = new Stack(app, 'talos-prod', { env });
  buildTalosAppStack({
    scope: stack,
    domainName: 'talos.borso.fr',
    assetsPath: path.join(WORKSPACE_ROOT, 'site'),
    apiEntry: path.join(WORKSPACE_ROOT, 'api', 'src', 'main.ts'),
    migrationsPath: path.join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations'),
    cluster: clusterStack.cluster,
  });
  return Template.fromStack(stack);
}

function readApiEnvironment(template: Template): Record<string, unknown> {
  const apiFunction = Object.entries(template.findResources('AWS::Lambda::Function')).find(
    ([logicalId]) => logicalId.includes('AppApiFn'),
  )?.[1];
  const properties: unknown = apiFunction?.Properties;
  if (typeof properties !== 'object' || properties === null) return {};
  if (!('Environment' in properties)) return {};
  const environment = properties.Environment;
  if (typeof environment !== 'object' || environment === null) return {};
  if (!('Variables' in environment)) return {};
  const variables = environment.Variables;
  return typeof variables === 'object' && variables !== null ? { ...variables } : {};
}

describe('talos app stack', () => {
  beforeAll(() => {
    synthAppStack();
  }, SYNTH_WARMUP_TIMEOUT_MILLISECONDS);

  it('tells the api which repository, parameter prefix and relying party it serves', () => {
    expect(readApiEnvironment(synthAppStack())).toMatchObject({
      GITHUB_REPO: 'hugoleborso/talos',
      TALOS_SSM_PREFIX: '/talos/',
      TALOS_RP_ID: 'talos.borso.fr',
    });
  });

  it('names the site bucket after the account, because talos-prod is unavailable in S3', () => {
    synthAppStack().hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'talos-prod-123456789012',
    });
  });

  it('lets the api read the parameters under /talos/ and nothing wider', () => {
    synthAppStack().hasResourceProperties(
      'AWS::IAM::Policy',
      Match.objectLike({
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: ['ssm:GetParameter', 'ssm:GetParameters'],
              Resource: Match.objectLike({
                'Fn::Join': Match.arrayWith([
                  Match.arrayWith([Match.stringLikeRegexp(':parameter/talos/\\*$')]),
                ]),
              }),
            }),
          ]),
        }),
      }),
    );
  });

  it('gives the api the time GitHub needs on a cold start, under the gateway limit', () => {
    synthAppStack().hasResourceProperties(
      'AWS::Lambda::Function',
      Match.objectLike({ FunctionName: Match.stringLikeRegexp('api'), Timeout: 29 }),
    );
  });

  it('lets the api connect to the talos cluster', () => {
    synthAppStack().hasResourceProperties(
      'AWS::IAM::Policy',
      Match.objectLike({
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([Match.objectLike({ Action: 'dsql:DbConnectAdmin' })]),
        }),
      }),
    );
  });

  it('serves the site on talos.borso.fr', () => {
    synthAppStack().hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({ Aliases: ['talos.borso.fr'] }),
      }),
    );
  });

  it('carries the database schema of the talos cluster', () => {
    synthAppStack().resourceCountIs('AWS::CloudFormation::CustomResource', 1);
  });
});
