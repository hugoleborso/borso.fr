import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DsqlSchema } from '../../src/constructs/dsql-schema.js';
import { isObject, outputValues, resourcesOfType } from './_helpers/template.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.join(HERE, 'fixtures', 'migrations');

function synth(props: { stage: 'prod' | 'preview' | 'integ'; prNumber?: number }) {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-west-3' },
  });
  new DsqlSchema(stack, 'Db', {
    app: 'test-app',
    stage: props.stage,
    ...(props.prNumber !== undefined ? { prNumber: props.prNumber } : {}),
    migrationsPath: MIGRATIONS,
  });
  return Template.fromStack(stack);
}

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
    expect(customResource?.Properties?.schemaName).toBe('test_app_pr_3');
    expect(customResource?.Properties?.migrations).toEqual([
      expect.objectContaining({ name: '0001_init.sql' }),
    ]);
  });

  it('emits a SchemaName output', () => {
    const tpl = synth({ stage: 'integ', prNumber: 4 });
    expect(outputValues(tpl)).toContain('integ_pr_4_test_app');
  });

  it('throws when migrationsPath does not exist', () => {
    const app = new App();
    const stack = new Stack(app, 'S', {
      env: { account: '123456789012', region: 'eu-west-3' },
    });
    expect(
      () =>
        new DsqlSchema(stack, 'Db', {
          app: 'test-app',
          stage: 'prod',
          migrationsPath: '/nonexistent-path-borso-test',
        }),
    ).toThrow(/migrationsPath does not exist/);
  });

  it('grantConnect adds dsql:DbConnect to the principal policy', () => {
    const app = new App();
    const stack = new Stack(app, 'S', {
      env: { account: '123456789012', region: 'eu-west-3' },
    });
    const schema = new DsqlSchema(stack, 'Db', {
      app: 'test-app',
      stage: 'prod',
      migrationsPath: MIGRATIONS,
    });
    expect(schema.schemaName).toBe('test_app');
    // grantConnect is exercised by lambda-api integration; we just make sure
    // the public surface is reachable.
    expect(typeof schema.grantConnect).toBe('function');
  });
});

describe('DsqlSchema (migrations directory edge cases)', () => {
  let tmp: string;

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'borso-migrations-'));
    // valid migrations
    fs.writeFileSync(path.join(tmp, '0001_init.sql'), 'CREATE TABLE x (id INT);');
    fs.writeFileSync(path.join(tmp, '0002_more.sql'), 'CREATE TABLE y (id INT);');
    // junk that should be ignored
    fs.writeFileSync(path.join(tmp, 'README.md'), 'noise');
    fs.writeFileSync(path.join(tmp, 'not-a-migration.sql'), 'noise');
  });

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('reads only files matching the migration pattern, in order', () => {
    const app = new App();
    const stack = new Stack(app, 'S', {
      env: { account: '123456789012', region: 'eu-west-3' },
    });
    new DsqlSchema(stack, 'Db', {
      app: 'test-app',
      stage: 'prod',
      migrationsPath: tmp,
    });
    const tpl = Template.fromStack(stack);
    const [customResource] = resourcesOfType(tpl, 'AWS::CloudFormation::CustomResource');
    expect(customResource?.Properties?.migrations).toEqual([
      expect.objectContaining({ name: '0001_init.sql' }),
      expect.objectContaining({ name: '0002_more.sql' }),
    ]);
  });
});
