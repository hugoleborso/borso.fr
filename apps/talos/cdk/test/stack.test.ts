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
    exportEntry: path.join(WORKSPACE_ROOT, 'api', 'src', 'main.export.ts'),
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

  it('lets the api connect to the talos cluster as its stage role, never as admin', () => {
    const template = synthAppStack();
    template.hasResourceProperties(
      'AWS::IAM::Policy',
      Match.objectLike({
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([Match.objectLike({ Action: 'dsql:DbConnect' })]),
        }),
      }),
    );
    template.hasResourceProperties(
      'AWS::Lambda::Function',
      Match.objectLike({
        FunctionName: Match.stringLikeRegexp('api'),
        Environment: { Variables: Match.objectLike({ DSQL_ROLE: 'api_prod' }) },
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
  it('keeps the weekly export in a private, versioned bucket that outlives the stack', () => {
    const template = synthAppStack();
    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Retain',
      Properties: Match.objectLike({
        VersioningConfiguration: { Status: 'Enabled' },
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            { ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } },
          ],
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
        LifecycleConfiguration: {
          Rules: [
            Match.objectLike({
              NoncurrentVersionExpiration: { NoncurrentDays: 90 },
              Status: 'Enabled',
            }),
          ],
        },
      }),
    });
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Deny',
            Condition: { Bool: { 'aws:SecureTransport': 'false' } },
          }),
        ]),
      }),
    });
  });

  it('runs the export every Sunday at 02:00 UTC against the production api', () => {
    const template = synthAppStack();
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'cron(0 2 ? * SUN *)',
    });
    template.hasResourceProperties(
      'AWS::Lambda::Function',
      Match.objectLike({
        Environment: {
          Variables: Match.objectLike({
            EXPORT_URL: 'https://talos.borso.fr/api/agent/export',
            AGENT_TOKEN_PARAMETER: '/talos/agent-token-build',
          }),
        },
      }),
    );
  });

  it('lets the export read one parameter and write objects, nothing else', () => {
    synthAppStack().hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'ssm:GetParameter',
            Resource: Match.objectLike({
              'Fn::Join': Match.arrayWith([
                Match.arrayWith([Match.stringLikeRegexp(':parameter/talos/agent-token-build$')]),
              ]),
            }),
          }),
          Match.objectLike({ Action: 's3:PutObject' }),
        ],
      },
    });
  });

  it('keeps 35 days of daily backups of the talos cluster in the cluster stack', () => {
    const app = new App();
    const env = { account: '123456789012', region: 'eu-west-3' };
    const clusterStack = new DsqlClusterStack(app, 'talos-cluster', {
      app: 'talos',
      env,
      backup: {},
    });
    const template = Template.fromStack(clusterStack);
    template.hasResourceProperties('AWS::Backup::BackupVault', {
      BackupVaultName: 'talos-dsql-backups',
    });
    template.hasResourceProperties('AWS::Backup::BackupPlan', {
      BackupPlan: Match.objectLike({
        BackupPlanRule: [Match.objectLike({ Lifecycle: { DeleteAfterDays: 35 } })],
      }),
    });
  });
});
