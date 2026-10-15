import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DsqlCluster } from '../../src/constructs/dsql-cluster.js';
import { DsqlSchema } from '../../src/constructs/dsql-schema.js';
import {
  isObject,
  outputValues,
  resourcesOfType,
  synthTemplate,
  TEST_ENV,
} from './helpers/template.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.join(HERE, 'fixtures', 'migrations');

function synth(props: {
  stage: 'prod' | 'preview' | 'integ';
  prNumber?: number;
  cloneFromSchema?: { readonly sourceSchemaName: string };
}) {
  return synthTemplate((stack) => {
    const cluster = new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' });
    new DsqlSchema(stack, 'Db', {
      app: 'test-app',
      stage: props.stage,
      ...(props.prNumber === undefined ? {} : { prNumber: props.prNumber }),
      migrationsPath: MIGRATIONS,
      cluster,
      ...(props.cloneFromSchema === undefined ? {} : { cloneFromSchema: props.cloneFromSchema }),
    });
  });
}

describe('DsqlSchema clone guard on credential tables', () => {
  let credentialMigrations: string;

  beforeAll(() => {
    credentialMigrations = fs.mkdtempSync(path.join(os.tmpdir(), 'borso-credential-migrations-'));
    fs.writeFileSync(
      path.join(credentialMigrations, '0001_init.sql'),
      'CREATE TABLE IF NOT EXISTS "app_config" (id INT PRIMARY KEY, password_hash TEXT NOT NULL);',
    );
  });

  afterAll(() => {
    fs.rmSync(credentialMigrations, { recursive: true, force: true });
  });

  function synthWithCredentialTable(cloneFromSchema: {
    readonly sourceSchemaName: string;
    readonly tableBlocklist?: readonly string[];
    readonly tablesToReplace?: readonly string[];
  }): Template {
    const app = new App();
    const stack = new Stack(app, 'GuardStack', {
      env: { account: '123456789012', region: 'eu-west-3' },
    });
    const cluster = new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' });
    new DsqlSchema(stack, 'Db', {
      app: 'test-app',
      stage: 'preview',
      prNumber: 1,
      migrationsPath: credentialMigrations,
      cluster,
      cloneFromSchema,
    });
    return Template.fromStack(stack);
  }

  it('refuses to synth when the config says nothing about the credential table', () => {
    expect(() => synthWithCredentialTable({ sourceSchemaName: 'prod' })).toThrow(
      /does not say what to do with app_config/,
    );
  });

  it('synths when the credential table is blocklisted', () => {
    expect(() =>
      synthWithCredentialTable({ sourceSchemaName: 'prod', tableBlocklist: ['app_config'] }),
    ).not.toThrow();
  });

  it('synths when the credential table is replaced', () => {
    expect(() =>
      synthWithCredentialTable({ sourceSchemaName: 'prod', tablesToReplace: ['app_config'] }),
    ).not.toThrow();
  });

  it('leaves a schema that does not clone alone', () => {
    expect(() => synth({ stage: 'prod' })).not.toThrow();
  });
});

// @FollowsBlueprint test-cdk-synth
describe('DsqlSchema', () => {
  it('creates a NodejsFunction migration runner with dsql:DbConnectAdmin', () => {
    const tpl = synth({ stage: 'prod' });
    const policies = resourcesOfType(tpl, 'AWS::IAM::Policy');
    const hasDbConnectAdmin = policies.some((policy) => {
      const policyDoc = policy.Properties?.PolicyDocument;
      if (!isObject(policyDoc) || !Array.isArray(policyDoc.Statement)) return false;
      return policyDoc.Statement.some((statement) => {
        if (!isObject(statement) || statement.Effect !== 'Allow') return false;
        const action = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
        return action.includes('dsql:DbConnectAdmin');
      });
    });
    expect(hasDbConnectAdmin).toBe(true);
  });

  it('creates a custom resource for the schema with the migrations payload', () => {
    const tpl = synth({ stage: 'preview', prNumber: 3 });
    const [customResource] = resourcesOfType(tpl, 'AWS::CloudFormation::CustomResource');
    expect(customResource).toBeDefined();
    expect(customResource?.Properties?.schemaName).toBe('pr_3');
    expect(customResource?.Properties?.migrations).toEqual([
      expect.objectContaining({ name: '0001_init.sql' }),
    ]);
  });

  it('forwards cloneFromSchema config to the custom resource properties when set', () => {
    const tpl = synth({
      stage: 'preview',
      prNumber: 27,
      cloneFromSchema: { sourceSchemaName: 'prod' },
    });
    const [customResource] = resourcesOfType(tpl, 'AWS::CloudFormation::CustomResource');
    expect(customResource?.Properties?.cloneFromSchema).toEqual({ sourceSchemaName: 'prod' });
  });

  it('omits cloneFromSchema from the custom resource properties when not set (default)', () => {
    const tpl = synth({ stage: 'preview', prNumber: 28 });
    const [customResource] = resourcesOfType(tpl, 'AWS::CloudFormation::CustomResource');
    expect(customResource?.Properties).not.toHaveProperty('cloneFromSchema');
  });

  it('emits a SchemaName output', () => {
    const tpl = synth({ stage: 'integ', prNumber: 4 });
    expect(outputValues(tpl)).toContain('integ_4');
  });

  it('throws when migrationsPath does not exist', () => {
    const app = new App();
    const stack = new Stack(app, 'S', { env: TEST_ENV });
    const cluster = new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' });
    expect(
      () =>
        new DsqlSchema(stack, 'Db', {
          app: 'test-app',
          stage: 'prod',
          migrationsPath: '/nonexistent-path-borso-test',
          cluster,
        }),
    ).toThrow(/migrationsPath does not exist/);
  });

  it('grantConnect gives the function dsql:DbConnect, never DbConnectAdmin', () => {
    const { template } = synthWithGrantedFunction();
    const apiPolicy = resourcesOfType(template, 'AWS::IAM::Policy').find((policy) =>
      JSON.stringify(policy.Properties?.Roles).includes('ApiServiceRole'),
    );
    const statements = JSON.stringify(apiPolicy?.Properties?.PolicyDocument);
    expect(statements).toContain('"dsql:DbConnect"');
    expect(statements).not.toContain('DbConnectAdmin');
  });

  it('grantConnect passes the role name and the function role ARN to the schema resource', () => {
    const { template } = synthWithGrantedFunction();
    const [customResource] = resourcesOfType(template, 'AWS::CloudFormation::CustomResource');
    expect(customResource?.Properties?.apiRoleName).toBe('api_prod');
    expect(JSON.stringify(customResource?.Properties?.apiPrincipalArns)).toContain(
      'ApiServiceRole',
    );
  });

  it('grantConnect makes the function deploy after the schema resource', () => {
    const { template } = synthWithGrantedFunction();
    const functions = template.findResources('AWS::Lambda::Function');
    const apiFunction = Object.entries(functions).find(([logicalId]) =>
      logicalId.startsWith('Api'),
    );
    const [schemaLogicalId] = Object.keys(
      template.findResources('AWS::CloudFormation::CustomResource'),
    );
    expect(apiFunction?.[1].DependsOn).toContain(schemaLogicalId);
  });

  it('grantConnect refuses a function without an execution role', () => {
    const app = new App();
    const stack = new Stack(app, 'S', { env: TEST_ENV });
    const cluster = new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' });
    const schema = new DsqlSchema(stack, 'Db', {
      app: 'test-app',
      stage: 'prod',
      migrationsPath: MIGRATIONS,
      cluster,
    });
    const imported = LambdaFunction.fromFunctionArn(
      stack,
      'Imported',
      'arn:aws:lambda:eu-west-3:123456789012:function:elsewhere',
    );
    expect(() => schema.grantConnect(imported)).toThrow('has no execution role to map');
  });

  it('grantConnect refuses a function defined outside this application', () => {
    const app = new App();
    const stack = new Stack(app, 'S', { env: TEST_ENV });
    const cluster = new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' });
    const schema = new DsqlSchema(stack, 'Db', {
      app: 'test-app',
      stage: 'prod',
      migrationsPath: MIGRATIONS,
      cluster,
    });
    const imported = LambdaFunction.fromFunctionAttributes(stack, 'Imported', {
      functionArn: 'arn:aws:lambda:eu-west-3:123456789012:function:elsewhere',
      role: Role.fromRoleArn(stack, 'ImportedRole', 'arn:aws:iam::123456789012:role/elsewhere'),
    });
    expect(() => schema.grantConnect(imported)).toThrow(
      'expected a function defined in this application',
    );
  });
});

function synthWithGrantedFunction(): { template: Template } {
  const app = new App();
  const stack = new Stack(app, 'S', { env: TEST_ENV });
  const cluster = new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' });
  const schema = new DsqlSchema(stack, 'Db', {
    app: 'test-app',
    stage: 'prod',
    migrationsPath: MIGRATIONS,
    cluster,
  });
  const handler = new LambdaFunction(stack, 'Api', {
    runtime: Runtime.NODEJS_22_X,
    handler: 'index.handler',
    code: Code.fromInline('export const handler = () => {};'),
  });
  schema.grantConnect(handler);
  expect(schema.apiRoleName).toBe('api_prod');
  return { template: Template.fromStack(stack) };
}

const MIGRATION_FILES = {
  '0001_init.sql': 'CREATE TABLE x (id INT);',
  '0002_more.sql': 'CREATE TABLE y (id INT);',
};
const FILES_THE_READER_IGNORES = ['README.md', 'not-a-migration.sql'];

describe('DsqlSchema (migrations directory edge cases)', () => {
  let temporaryDirectory: string;

  beforeAll(() => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'borso-migrations-'));
    for (const [name, sql] of Object.entries(MIGRATION_FILES)) {
      fs.writeFileSync(path.join(temporaryDirectory, name), sql);
    }
    for (const name of FILES_THE_READER_IGNORES) {
      fs.writeFileSync(path.join(temporaryDirectory, name), 'noise');
    }
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reads only files matching the migration pattern, in order', () => {
    const app = new App();
    const stack = new Stack(app, 'S', { env: TEST_ENV });
    const cluster = new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' });
    new DsqlSchema(stack, 'Db', {
      app: 'test-app',
      stage: 'prod',
      migrationsPath: temporaryDirectory,
      cluster,
    });
    const tpl = Template.fromStack(stack);
    const [customResource] = resourcesOfType(tpl, 'AWS::CloudFormation::CustomResource');
    expect(customResource?.Properties?.migrations).toEqual([
      expect.objectContaining({ name: '0001_init.sql' }),
      expect.objectContaining({ name: '0002_more.sql' }),
    ]);
  });
});
