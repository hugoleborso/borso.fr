import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Stack } from 'aws-cdk-lib';
import { Match, type Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { DsqlCluster } from '../../src/constructs/dsql-cluster.js';
import {
  AGENT_READER_FUNCTION_NAME_OUTPUT,
  DsqlAgentReader,
} from '../../src/constructs/dsql-agent-reader.js';
import { DsqlSchema, type DsqlSchemaProps } from '../../src/constructs/dsql-schema.js';
import { synthTemplate } from './helpers/template.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.join(HERE, 'fixtures', 'migrations');
const AGENT_USER_ARN = 'arn:aws:iam::123456789012:user/AI-Dev-ReadOnly';
const BLOCKLIST = ['member_credential', 'auth_attempt'];

function buildSchema(stack: Stack, overrides: Partial<DsqlSchemaProps> = {}): DsqlSchema {
  return new DsqlSchema(stack, 'Db', {
    app: 'test-app',
    stage: 'prod',
    migrationsPath: MIGRATIONS,
    cluster: new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' }),
    readerPrincipalArns: [AGENT_USER_ARN],
    ...overrides,
  });
}

function synth(readerOverrides: { tableBlocklist?: readonly string[] } = {}): Template {
  return synthTemplate((stack) => {
    new DsqlAgentReader(stack, 'Reader', {
      app: 'test-app',
      stage: 'prod',
      schema: buildSchema(stack),
      ...readerOverrides,
    });
  });
}

// @FollowsBlueprint test-cdk-synth
describe('DsqlAgentReader', () => {
  it('names the function per the convention and publishes it under a stable output key', () => {
    const template = synth();
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'test-app-prod-agent-reader',
      Runtime: 'nodejs22.x',
      Architectures: ['arm64'],
    });
    expect(template.toJSON()).toHaveProperty(
      ['Outputs', AGENT_READER_FUNCTION_NAME_OUTPUT, 'Value'],
      'test-app-prod-agent-reader',
    );
  });

  it('publishes no URL and mounts no route, so SigV4 on the invoke is the only way in', () => {
    const template = synth();
    template.resourceCountIs('AWS::Lambda::Url', 0);
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 0);
    template.resourceCountIs('AWS::Lambda::Permission', 0);
  });

  it('passes the schema, the reader role and the blocklist to the handler', () => {
    synth({ tableBlocklist: BLOCKLIST }).hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'test-app-prod-agent-reader',
      Environment: {
        Variables: Match.objectLike({
          DSQL_SCHEMA: 'prod',
          DSQL_ROLE: 'ai_reader_prod',
          READER_TABLE_BLOCKLIST: 'member_credential,auth_attempt',
        }),
      },
    });
  });

  it('passes an empty blocklist when the application names no table', () => {
    synth().hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'test-app-prod-agent-reader',
      Environment: { Variables: Match.objectLike({ READER_TABLE_BLOCKLIST: '' }) },
    });
  });

  it('grants the handler DbConnect and nothing else on the cluster', () => {
    synth().hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Action: 'dsql:DbConnect', Effect: 'Allow' }),
        ]),
      },
    });
  });

  it('maps the handler role into the schema alongside the agent IAM user', () => {
    const template = synth();
    const resources = template.findResources('AWS::CloudFormation::CustomResource');
    const schema = Object.values(resources)[0];
    const mapped: unknown = schema?.Properties?.readerPrincipalArns;
    expect(Array.isArray(mapped)).toBe(true);
    expect(mapped).toHaveLength(2);
    expect(mapped).toContain(AGENT_USER_ARN);
  });

  it('refuses a schema that provisions no reader, rather than connecting as nothing', () => {
    expect(() =>
      synthTemplate((stack) => {
        new DsqlAgentReader(stack, 'Reader', {
          app: 'test-app',
          stage: 'prod',
          schema: buildSchema(stack, { readerPrincipalArns: [] }),
        });
      }),
    ).toThrow('has no read-only database role');
  });

  it('refuses the dev stage, which is not deployable', () => {
    expect(() =>
      synthTemplate((stack) => {
        new DsqlAgentReader(stack, 'Reader', {
          app: 'test-app',
          stage: 'dev',
          schema: buildSchema(stack),
        });
      }),
    ).toThrow('not deployable');
  });

  it('refuses an app slug that is not kebab-case', () => {
    expect(() =>
      synthTemplate((stack) => {
        new DsqlAgentReader(stack, 'Reader', {
          app: 'Test_App',
          stage: 'prod',
          schema: buildSchema(stack),
        });
      }),
    ).toThrow('Invalid app slug');
  });
});
